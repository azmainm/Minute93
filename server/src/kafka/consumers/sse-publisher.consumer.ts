import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../kafka.service.js';
import { RedisService } from '../../redis/redis.service.js';
import type { MatchEventPayload } from './match-event.interface.js';

@Injectable()
export class SsePublisherConsumer implements OnModuleInit {
  private readonly logger = new Logger(SsePublisherConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    const topic = this.kafkaService.getTopic();
    await this.kafkaService.consume(
      'minute93-sse-publisher',
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
    const channel = `match:${event.match_api_id}:events`;
    const payload = JSON.stringify({
      event_type: event.event_type,
      minute: event.minute,
      player_name: event.player_name,
      team_api_id: event.team_api_id,
      home_score: event.home_score,
      away_score: event.away_score,
      match_status: event.match_status,
      detail: event.detail,
      timestamp: new Date().toISOString(),
    });

    await this.redisService.publish(channel, payload);

    this.logger.debug(
      `Published to ${channel}: ${event.event_type} at ${event.minute}'`,
    );
  }
}
