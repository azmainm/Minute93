import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export const getRedisConfig = (configService: ConfigService): RedisOptions => {
  const redisUrl = configService.getOrThrow<string>('REDIS_URL');
  const url = new URL(redisUrl);

  return {
    host: url.hostname,
    port: parseInt(url.port, 10) || 6379,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    retryStrategy: (times: number) => {
      if (times > 10) {
        return null;
      }
      return Math.min(times * 200, 5000);
    },
  };
};
