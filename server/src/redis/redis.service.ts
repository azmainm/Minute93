import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConfig } from '../config/redis.config.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private subscriber: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = getRedisConfig(this.configService);
    this.client = new Redis(config);
    this.subscriber = new Redis(config);

    this.client.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });

    this.subscriber.on('error', (err) => {
      this.logger.error(`Redis subscriber error: ${err.message}`);
    });

    this.logger.log('Redis connected');
  }

  async onModuleDestroy() {
    await this.client?.quit();
    await this.subscriber?.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

  // ===== Cache-Aside Pattern =====

  async cacheGet(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      this.logger.warn(`Cache get failed for key ${key}: ${(error as Error).message}`);
      return null;
    }
  }

  async cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch (error) {
      this.logger.warn(`Cache set failed for key ${key}: ${(error as Error).message}`);
    }
  }

  async cacheDel(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.warn(`Cache del failed for key ${key}: ${(error as Error).message}`);
    }
  }

  // ===== Pub/Sub Pattern =====

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(
    channel: string,
    callback: (message: string) => void,
  ): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (ch, msg) => {
      if (ch === channel) {
        callback(msg);
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  // ===== Deduplication Set Pattern =====

  async isDuplicate(key: string, member: string): Promise<boolean> {
    const result = await this.client.sadd(key, member);
    return result === 0;
  }

  async setExpire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // ===== Rate Limiting Pattern =====

  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const count = await this.client.incr(key);
    if (count === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return count;
  }
}
