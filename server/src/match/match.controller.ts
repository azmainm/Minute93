import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MatchService } from './match.service.js';
import { MatchQueryDto } from './dto/match-query.dto.js';

@Controller('matches')
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  async findAll(@Query() query: MatchQueryDto) {
    return this.matchService.findAll(query);
  }

  @Get('live')
  async findLive() {
    return this.matchService.findLive();
  }

  @Get('results')
  async findResults() {
    return this.matchService.findResults();
  }

  @Get('schedule')
  async findSchedule() {
    return this.matchService.findSchedule();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const match = await this.matchService.findById(id);
    const events = await this.matchService.findEventsByMatchId(id);
    const lineups = await this.matchService.findLineupsByMatchId(id);
    return { ...match, events, lineups };
  }

  @Get(':id/events')
  async findEvents(@Param('id', ParseIntPipe) id: number) {
    return this.matchService.findEventsByMatchId(id);
  }
}
