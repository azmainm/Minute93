import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerController } from './player.controller.js';
import { PlayerService } from './player.service.js';
import { Player } from './entities/player.entity.js';
import { MatchEvent } from '../match/entities/match-event.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Player, MatchEvent])],
  controllers: [PlayerController],
  providers: [PlayerService],
  exports: [PlayerService],
})
export class PlayerModule {}
