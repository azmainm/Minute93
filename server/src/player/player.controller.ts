import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PlayerService } from './player.service.js';

@Controller('players')
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.playerService.findById(id);
  }
}
