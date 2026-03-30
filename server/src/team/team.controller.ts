import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TeamService } from './team.service.js';
import { IsInt, IsOptional } from 'class-validator';

class TeamQueryDto {
  @IsInt()
  @IsOptional()
  league_id?: number;
}

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async findAll(@Query() query: TeamQueryDto) {
    return this.teamService.findAll(query.league_id);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findById(id);
  }
}
