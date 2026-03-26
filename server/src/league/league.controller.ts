import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LeagueService } from './league.service.js';
import { IsInt, IsOptional } from 'class-validator';

class StandingsQueryDto {
  @IsInt()
  @IsOptional()
  league_id?: number;

  @IsInt()
  @IsOptional()
  season?: number;
}

class TopScorersQueryDto {
  @IsInt()
  @IsOptional()
  limit?: number;

  @IsInt()
  @IsOptional()
  season?: number;
}

@Controller()
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Get('standings')
  async getStandings(@Query() query: StandingsQueryDto) {
    return this.leagueService.getStandings(query.league_id, query.season);
  }

  @Get('top-scorers')
  async getTopScorers(@Query() query: TopScorersQueryDto) {
    return this.leagueService.getTopScorers(query.limit || 20, query.season);
  }
}
