import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { Player } from '../player/entities/player.entity.js';
import { Team } from '../team/entities/team.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Player, Team])],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
