import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { KafkaService } from '../kafka.service.js';
import type { MatchEventPayload } from './match-event.interface.js';

@Injectable()
export class StatsAggregatorConsumer implements OnModuleInit {
  private readonly logger = new Logger(StatsAggregatorConsumer.name);
  private readonly apiKey: string;
  private readonly apiBase: string;
  private readonly activeLeagues: number[];

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('API_FOOTBALL_KEY') || '';
    this.apiBase = this.configService.get<string>('API_FOOTBALL_BASE_URL') || 'https://v3.football.api-sports.io';
    this.activeLeagues = (this.configService.get<string>('ACTIVE_LEAGUES') || '2')
      .split(',').map(Number);
  }

  async onModuleInit() {
    const topic = this.kafkaService.getTopic();
    await this.kafkaService.consume(
      'minute93-stats-aggregator',
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
    const isMatchEnd = event.match_status === 'finished';
    const isGoal = ['goal', 'own_goal', 'penalty'].includes(event.event_type);

    if (!isGoal && !isMatchEnd) return;

    if (!this.apiKey) {
      this.logger.warn('API_FOOTBALL_KEY not set — skipping standings refresh');
      return;
    }

    const leagueApiId = event.league_api_id;
    if (!leagueApiId) return;

    try {
      await this.refreshStandingsFromApi(leagueApiId);
      this.logger.debug(
        `Standings refreshed for league ${leagueApiId} (trigger: ${isMatchEnd ? 'match_end' : event.event_type})`,
      );
    } catch (error) {
      this.logger.error(`Standings refresh failed: ${(error as Error).message}`);
    }
  }

  private async refreshStandingsFromApi(leagueApiId: number): Promise<void> {
    const season = Number(this.configService.get<string>('POLL_SEASON') || '2025');
    const url = `${this.apiBase}/standings?league=${leagueApiId}&season=${season}`;

    const res = await fetch(url, {
      headers: { 'x-apisports-key': this.apiKey },
    });

    if (!res.ok) {
      this.logger.warn(`API-Football standings error: ${res.status}`);
      return;
    }

    const json = await res.json() as {
      response: Array<{
        league: {
          standings: Array<Array<{
            rank: number;
            team: { id: number };
            points: number;
            goalsDiff: number;
            group: string;
            form: string;
            all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
          }>>;
        };
      }>;
    };

    if (!json.response?.length) return;

    const leagueRow = await this.dataSource.query(
      'SELECT id FROM leagues WHERE api_football_id = $1',
      [leagueApiId],
    );
    if (!leagueRow.length) return;
    const dbLeagueId = leagueRow[0].id;

    for (const standingsGroup of json.response[0].league.standings) {
      for (const row of standingsGroup) {
        const teamRow = await this.dataSource.query(
          'SELECT id FROM teams WHERE api_football_id = $1',
          [row.team.id],
        );
        if (!teamRow.length) continue;

        await this.dataSource.query(`
          INSERT INTO standings (league_id, team_id, season, rank, group_name, played, wins, draws, losses, goals_for, goals_against, goal_difference, points, form, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (league_id, team_id, season) DO UPDATE SET
            rank = $4, group_name = $5, played = $6, wins = $7, draws = $8, losses = $9,
            goals_for = $10, goals_against = $11, goal_difference = $12, points = $13, form = $14, updated_at = NOW()
        `, [
          dbLeagueId, teamRow[0].id, season, row.rank, row.group || null,
          row.all.played, row.all.win, row.all.draw, row.all.lose,
          row.all.goals.for, row.all.goals.against, row.goalsDiff, row.points, row.form,
        ]);
      }
    }
  }
}
