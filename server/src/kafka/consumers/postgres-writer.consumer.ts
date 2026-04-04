import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaService } from '../kafka.service.js';
import { Match } from '../../match/entities/match.entity.js';
import { MatchEvent } from '../../match/entities/match-event.entity.js';
import { Team } from '../../team/entities/team.entity.js';
import { League } from '../../league/entities/league.entity.js';
import type { MatchEventPayload } from './match-event.interface.js';

@Injectable()
export class PostgresWriterConsumer implements OnModuleInit {
  private readonly logger = new Logger(PostgresWriterConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly matchEventRepository: Repository<MatchEvent>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {}

  async onModuleInit() {
    const topic = this.kafkaService.getTopic();
    await this.kafkaService.consume(
      'minute93-postgres-writer',
      topic,
      async ({ message }) => {
        if (!message.value) return;
        try {
          const event: MatchEventPayload = JSON.parse(message.value.toString());
          await this.handleEvent(event);
        } catch (error) {
          this.logger.error(`Failed to process message: ${(error as Error).message}`);
        }
      },
    );
  }

  private async handleEvent(event: MatchEventPayload): Promise<void> {
    let match = await this.matchRepository.findOne({
      where: { api_football_id: event.match_api_id },
    });

    if (!match) {
      match = await this.autoCreateMatch(event);
      if (!match) {
        this.logger.warn(`Match not found for api_id ${event.match_api_id} and auto-creation failed`);
        return;
      }
    }

    await this.matchRepository.update(match.id, {
      home_score: event.home_score,
      away_score: event.away_score,
      status: event.match_status,
      minute: event.minute,
      updated_at: new Date(),
    });

    // Insert event record (if it's an actual event, not just a status update)
    if (event.event_type && event.event_type !== 'status_update') {
      let teamId: number | null = null;
      if (event.team_api_id) {
        const team = await this.teamRepository.findOne({
          where: { api_football_id: event.team_api_id },
        });
        teamId = team?.id || null;
      }

      await this.matchEventRepository.save({
        match_id: match.id,
        event_type: event.event_type,
        minute: event.minute,
        player_name: event.player_name,
        team_id: teamId,
        detail: event.detail,
      });

      this.logger.debug(
        `Persisted: ${event.event_type} at ${event.minute}' for match ${match.id}`,
      );
    }
  }

  /**
   * Auto-creates a match row from enriched event metadata.
   * Prevents matches from being invisible when the fixture wasn't pre-seeded.
   */
  private async autoCreateMatch(event: MatchEventPayload): Promise<Match | null> {
    if (!event.league_api_id || !event.home_team_api_id || !event.away_team_api_id || !event.kickoff_at) {
      this.logger.warn(
        `Cannot auto-create match ${event.match_api_id}: missing fixture metadata`,
      );
      return null;
    }

    try {
      const [league, homeTeam, awayTeam] = await Promise.all([
        this.leagueRepository.findOne({ where: { api_football_id: event.league_api_id } }),
        this.teamRepository.findOne({ where: { api_football_id: event.home_team_api_id } }),
        this.teamRepository.findOne({ where: { api_football_id: event.away_team_api_id } }),
      ]);

      const newMatch = this.matchRepository.create({
        api_football_id: event.match_api_id,
        league_id: league?.id ?? null,
        home_team_id: homeTeam?.id ?? null,
        away_team_id: awayTeam?.id ?? null,
        home_score: event.home_score,
        away_score: event.away_score,
        status: event.match_status,
        season: event.season ?? 2025,
        kickoff_at: new Date(event.kickoff_at),
        venue: event.venue ?? null,
      });

      const saved = await this.matchRepository.save(newMatch);
      this.logger.log(
        `Auto-created match ${saved.id} (api_id: ${event.match_api_id})`,
      );
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to auto-create match ${event.match_api_id}: ${(error as Error).message}`,
      );
      return null;
    }
  }
}
