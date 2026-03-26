import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validate } from './config/env.validation.js';
import { getDatabaseConfig } from './config/database.config.js';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware.js';
import { AppController } from './app.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { MatchModule } from './match/match.module.js';
import { TeamModule } from './team/team.module.js';
import { PlayerModule } from './player/player.module.js';
import { SearchModule } from './search/search.module.js';
import { LeagueModule } from './league/league.module.js';
import { RedisModule } from './redis/redis.module.js';
import { KafkaModule } from './kafka/kafka.module.js';
import { PollerModule } from './poller/poller.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { TrackingMiddleware } from './analytics/tracking.middleware.js';
import { MetricsModule } from './metrics/metrics.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    RedisModule,
    KafkaModule,
    AuthModule,
    MatchModule,
    TeamModule,
    PlayerModule,
    SearchModule,
    LeagueModule,
    PollerModule,
    AnalyticsModule,
    MetricsModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(TrackingMiddleware).forRoutes('*');
  }
}
