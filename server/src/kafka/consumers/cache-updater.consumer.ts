import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaService } from '../kafka.service.js';
import { RedisService } from '../../redis/redis.service.js';
import type { MatchEventPayload } from './match-event.interface.js';

const CACHE_TTL_LIVE = 300; // 5 min safety net
const CACHE_TTL_STANDINGS = 3600; // 1 hour

@Injectable()
export class CacheUpdaterConsumer implements OnModuleInit {
  private readonly logger = new Logger(CacheUpdaterConsumer.name);

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    const topic = this.kafkaService.getTopic();
    await this.kafkaService.consume(
      'minute93-cache-updater',
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
    // Update live score in cache
    const scoreKey = `match:${event.match_api_id}:score`;
    const scoreData = JSON.stringify({
      home_score: event.home_score,
      away_score: event.away_score,
      status: event.match_status,
      minute: event.minute,
    });
    await this.redisService.cacheSet(scoreKey, scoreData, CACHE_TTL_LIVE);

    // Invalidate standings cache so next read fetches fresh data
    await this.redisService.cacheDel('standings:*');

    this.logger.debug(
      `Cache updated: match ${event.match_api_id} → ${event.home_score}-${event.away_score} (${event.match_status})`,
    );
  }
}
