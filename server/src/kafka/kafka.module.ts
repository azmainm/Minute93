import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaService } from './kafka.service.js';
import { CacheUpdaterConsumer } from './consumers/cache-updater.consumer.js';
import { PostgresWriterConsumer } from './consumers/postgres-writer.consumer.js';
import { StatsAggregatorConsumer } from './consumers/stats-aggregator.consumer.js';
import { SsePublisherConsumer } from './consumers/sse-publisher.consumer.js';
import { Match } from '../match/entities/match.entity.js';
import { MatchEvent } from '../match/entities/match-event.entity.js';
import { Team } from '../team/entities/team.entity.js';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchEvent, Team])],
  providers: [
    KafkaService,
    CacheUpdaterConsumer,
    PostgresWriterConsumer,
    StatsAggregatorConsumer,
    SsePublisherConsumer,
  ],
  exports: [KafkaService],
})
export class KafkaModule {}
