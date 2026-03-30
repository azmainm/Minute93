import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity.js';
import { Match } from '../match/entities/match.entity.js';
import { Player } from '../player/entities/player.entity.js';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
  ) {}

  async findAll(leagueId?: number): Promise<Team[]> {
    return this.teamRepository.find({
      where: leagueId ? { league_id: leagueId } : undefined,
      relations: ['league'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: number): Promise<{
    team: Team;
    players: Player[];
    recentMatches: Match[];
    upcomingMatches: Match[];
  }> {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['league'],
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    const recentMatches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.home_team', 'home_team')
      .leftJoinAndSelect('match.away_team', 'away_team')
      .where('match.home_team_id = :id OR match.away_team_id = :id', { id })
      .andWhere('match.status = :status', { status: 'finished' })
      .orderBy('match.kickoff_at', 'DESC')
      .take(10)
      .getMany();

    const upcomingMatches = await this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.home_team', 'home_team')
      .leftJoinAndSelect('match.away_team', 'away_team')
      .where('match.home_team_id = :id OR match.away_team_id = :id', { id })
      .andWhere('match.status = :status', { status: 'scheduled' })
      .orderBy('match.kickoff_at', 'ASC')
      .take(5)
      .getMany();

    const players = await this.playerRepository.find({
      where: { team_id: id },
      order: { position: 'ASC', name: 'ASC' },
    });

    return { team, players, recentMatches, upcomingMatches };
  }
}
