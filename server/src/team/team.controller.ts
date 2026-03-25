import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TeamService } from './team.service.js';

@Controller('teams')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get()
  async findAll() {
    return this.teamService.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findById(id);
  }
}
