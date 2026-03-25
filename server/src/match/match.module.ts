import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchController } from './match.controller.js';
import { MatchService } from './match.service.js';
import { Match } from './entities/match.entity.js';
import { MatchEvent } from './entities/match-event.entity.js';
import { MatchLineup } from './entities/match-lineup.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchEvent, MatchLineup])],
  controllers: [MatchController],
  providers: [MatchService],
  exports: [MatchService],
})
export class MatchModule {}
