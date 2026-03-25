import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { LeagueService } from './league.service.js';
import { IsInt, IsOptional } from 'class-validator';

class StandingsQueryDto {
  @IsInt()
  @IsOptional()
  league_id?: number;
}

@Controller()
export class LeagueController {
  constructor(private readonly leagueService: LeagueService) {}

  @Get('standings')
  async getStandings(@Query() query: StandingsQueryDto) {
    return this.leagueService.getStandings(query.league_id);
  }

  @Get('top-scorers')
  async getTopScorers(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.leagueService.getTopScorers(limit || 20);
  }
}
