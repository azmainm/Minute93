import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamController } from './team.controller.js';
import { TeamService } from './team.service.js';
import { Team } from './entities/team.entity.js';
import { Match } from '../match/entities/match.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Team, Match])],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
