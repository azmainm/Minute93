import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PollerService } from './poller.service.js';
import { Match } from '../match/entities/match.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Match])],
  providers: [PollerService],
})
export class PollerModule {}
