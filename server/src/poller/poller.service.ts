import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from '../kafka/kafka.service.js';
import { RedisService } from '../redis/redis.service.js';
import type { MatchEventPayload } from '../kafka/consumers/match-event.interface.js';

interface ApiFixture {
  fixture: {
    id: number;
    status: { short: string; elapsed: number | null };
  };
  league: { id: number };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  events: Array<{
    time: { elapsed: number | null };
    team: { id: number } | null;
    player: { name: string } | null;
    type: string;
    detail: string;
    comments: string | null;
  }>;
}

const STATUS_MAP: Record<string, string> = {
  TBD: 'scheduled', NS: 'scheduled', '1H': 'live', HT: 'halftime',
  '2H': 'live', ET: 'extra_time', P: 'penalties', FT: 'finished',
  AET: 'finished', PEN: 'finished', BT: 'finished',
  SUSP: 'suspended', INT: 'suspended', PST: 'postponed',
  CANC: 'cancelled', ABD: 'cancelled', AWD: 'finished', WO: 'finished',
};

const EVENT_TYPE_MAP: Record<string, string> = {
  Goal: 'goal',
  Card: 'card',
  subst: 'substitution',
  Var: 'var',
};

const DEDUP_KEY = 'processed:events';
const DEDUP_TTL = 86400; // 24 hours

@Injectable()
export class PollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PollerService.name);
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private isPolling = false;

  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly activeLeagues: number[];
  private readonly pollIntervalLive: number;
  private readonly pollIntervalIdle: number;
  private readonly pollSeason: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
  ) {
    this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') || '';
    this.apiBase = this.configService.get<string>('API_FOOTBALL_BASE_URL') || 'https://v3.football.api-sports.io';
    this.activeLeagues = (this.configService.get<string>('ACTIVE_LEAGUES') || '2')
      .split(',').map(Number);
    this.pollIntervalLive = Number(this.configService.get<string>('POLL_INTERVAL_LIVE') || '30000');
    this.pollIntervalIdle = Number(this.configService.get<string>('POLL_INTERVAL_IDLE') || '300000');
    this.pollSeason = this.configService.get<string>('POLL_SEASON') || '2025';
  }

  async onModuleInit() {
    if (!this.apiKey) {
      this.logger.warn('API_FOOTBALL_KEY not set — poller disabled');
      return;
    }
    this.logger.log(`Poller starting. Leagues: ${this.activeLeagues.join(', ')}`);
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private hasLiveMatches = false;

  private startPolling() {
    // Poll immediately, then schedule next
    this.poll();
    this.scheduleNextPoll();
  }

  private scheduleNextPoll() {
    const interval = this.hasLiveMatches
      ? this.pollIntervalLive
      : this.pollIntervalIdle;
    this.pollTimer = setTimeout(() => {
      this.poll();
      this.scheduleNextPoll();
    }, interval);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private async poll() {
    if (this.isPolling) return;
    this.isPolling = true;

    let foundLiveMatches = false;
    try {
      for (const leagueId of this.activeLeagues) {
        const hasLive = await this.pollLeague(leagueId);
        if (hasLive) foundLiveMatches = true;
      }
    } catch (error) {
      this.logger.error(`Poll cycle failed: ${(error as Error).message}`);
    } finally {
      const wasLive = this.hasLiveMatches;
      this.hasLiveMatches = foundLiveMatches;
      if (wasLive !== foundLiveMatches) {
        this.logger.log(
          `Polling interval switched to ${foundLiveMatches ? 'live' : 'idle'} (${foundLiveMatches ? this.pollIntervalLive : this.pollIntervalIdle}ms)`,
        );
      }
      this.isPolling = false;
    }
  }

  private async pollLeague(leagueId: number): Promise<boolean> {
    const url = new URL('/fixtures', this.apiBase);
    url.searchParams.set('league', String(leagueId));
    url.searchParams.set('season', this.pollSeason);
    url.searchParams.set('live', 'all');

    const res = await fetch(url.toString(), {
      headers: { 'x-apisports-key': this.apiKey },
    });

    if (!res.ok) {
      this.logger.warn(`API-Football error for league ${leagueId}: ${res.status}`);
      return false;
    }

    const json = await res.json() as { response: ApiFixture[] };
    const fixtures = json.response || [];

    if (fixtures.length === 0) return false;

    this.logger.debug(`League ${leagueId}: ${fixtures.length} live fixture(s)`);

    for (const fixture of fixtures) {
      await this.processFixture(fixture);
    }

    return true;
  }

  private async processFixture(fixture: ApiFixture) {
    const matchApiId = fixture.fixture.id;
    const status = STATUS_MAP[fixture.fixture.status.short] || 'scheduled';
    const topic = this.kafkaService.getTopic();

    // Always send a status update
    const statusEventId = `${matchApiId}:status:${status}:${fixture.goals.home}-${fixture.goals.away}`;
    const isStatusDuplicate = await this.redisService.isDuplicate(DEDUP_KEY, statusEventId);
    await this.redisService.setExpire(DEDUP_KEY, DEDUP_TTL);

    if (!isStatusDuplicate) {
      const payload: MatchEventPayload = {
        match_api_id: matchApiId,
        event_type: 'status_update',
        minute: fixture.fixture.status.elapsed,
        player_name: null,
        team_api_id: null,
        detail: null,
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        match_status: status,
      };

      await this.kafkaService.produce(topic, {
        key: String(matchApiId),
        value: JSON.stringify(payload),
      });
    }

    // Process individual events (goals, cards, subs)
    for (const event of fixture.events || []) {
      const eventType = EVENT_TYPE_MAP[event.type] || event.type.toLowerCase();
      const eventId = `${matchApiId}:${eventType}:${event.time.elapsed}:${event.player?.name || 'unknown'}`;

      const isDuplicate = await this.redisService.isDuplicate(DEDUP_KEY, eventId);
      if (isDuplicate) continue;

      await this.redisService.setExpire(DEDUP_KEY, DEDUP_TTL);

      const payload: MatchEventPayload = {
        match_api_id: matchApiId,
        event_type: eventType,
        minute: event.time.elapsed,
        player_name: event.player?.name || null,
        team_api_id: event.team?.id || null,
        detail: { detail: event.detail, comments: event.comments },
        home_score: fixture.goals.home,
        away_score: fixture.goals.away,
        match_status: status,
      };

      await this.kafkaService.produce(topic, {
        key: String(matchApiId),
        value: JSON.stringify(payload),
      });

      this.logger.debug(
        `Event: ${eventType} at ${event.time.elapsed}' in match ${matchApiId}`,
      );
    }
  }
}
