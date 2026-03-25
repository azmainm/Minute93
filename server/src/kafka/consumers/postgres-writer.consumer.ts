import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaService } from '../kafka.service.js';
import { Match } from '../../match/entities/match.entity.js';
import { MatchEvent } from '../../match/entities/match-event.entity.js';
import { Team } from '../../team/entities/team.entity.js';
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
    // Find the match by api_football_id
    const match = await this.matchRepository.findOne({
      where: { api_football_id: event.match_api_id },
    });

    if (!match) {
      this.logger.warn(`Match not found for api_id ${event.match_api_id}`);
      return;
    }

    // Update match score and status
    await this.matchRepository.update(match.id, {
      home_score: event.home_score,
      away_score: event.away_score,
      status: event.match_status,
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
}
