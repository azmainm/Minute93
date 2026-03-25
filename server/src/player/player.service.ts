import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from './entities/player.entity.js';
import { MatchEvent } from '../match/entities/match-event.entity.js';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(MatchEvent)
    private readonly matchEventRepository: Repository<MatchEvent>,
  ) {}

  async findById(id: number): Promise<{
    player: Player;
    stats: { goals: number; assists: number; yellowCards: number; redCards: number };
    recentEvents: MatchEvent[];
  }> {
    const player = await this.playerRepository.findOne({
      where: { id },
      relations: ['team'],
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${id} not found`);
    }

    const goals = await this.matchEventRepository.count({
      where: { player_name: player.name, event_type: 'goal' },
    });

    const assists = await this.matchEventRepository.count({
      where: { player_name: player.name, event_type: 'assist' },
    });

    const yellowCards = await this.matchEventRepository.count({
      where: { player_name: player.name, event_type: 'yellowcard' },
    });

    const redCards = await this.matchEventRepository.count({
      where: { player_name: player.name, event_type: 'redcard' },
    });

    const recentEvents = await this.matchEventRepository.find({
      where: { player_name: player.name },
      relations: ['match', 'team'],
      order: { created_at: 'DESC' },
      take: 20,
    });

    return {
      player,
      stats: { goals, assists, yellowCards, redCards },
      recentEvents,
    };
  }
}
