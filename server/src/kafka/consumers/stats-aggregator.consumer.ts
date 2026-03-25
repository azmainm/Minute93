import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KafkaService } from '../kafka.service.js';
import type { MatchEventPayload } from './match-event.interface.js';

@Injectable()
export class StatsAggregatorConsumer implements OnModuleInit {
  private readonly logger = new Logger(StatsAggregatorConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly dataSource: DataSource,
  ) {}

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
    // Only refresh views on score-changing or match-ending events
    const refreshTriggers = ['goal', 'own_goal', 'penalty'];
    const isMatchEnd = event.match_status === 'finished';
    const isGoal = refreshTriggers.includes(event.event_type);

    if (!isGoal && !isMatchEnd) return;

    try {
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS mv_standings',
      );
      await this.dataSource.query(
        'REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS mv_top_scorers',
      );
      this.logger.debug(
        `Materialized views refreshed (trigger: ${isMatchEnd ? 'match_end' : event.event_type})`,
      );
    } catch (error) {
      // Views may not exist yet — that's OK during early development
      this.logger.warn(`View refresh failed (may not exist yet): ${(error as Error).message}`);
    }
  }
}
