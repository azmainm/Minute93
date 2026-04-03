import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Match } from './entities/match.entity.js';
import { MatchEvent } from './entities/match-event.entity.js';
import { MatchLineup } from './entities/match-lineup.entity.js';
import { MatchQueryDto } from './dto/match-query.dto.js';
import { PaginatedData } from '../common/interfaces/api-response.interface.js';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEvent)
    private readonly matchEventRepository: Repository<MatchEvent>,
    @InjectRepository(MatchLineup)
    private readonly matchLineupRepository: Repository<MatchLineup>,
  ) {}

  async findAll(query: MatchQueryDto): Promise<PaginatedData<Match>> {
    const { page, limit, sort, order, status, league_id, date, round, season } = query;
    const skip = (page - 1) * limit;

    const qb = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.home_team', 'home_team')
      .leftJoinAndSelect('match.away_team', 'away_team')
      .leftJoinAndSelect('match.league', 'league');

    if (status) {
      qb.andWhere('match.status = :status', { status });
    }
    if (league_id) {
      qb.andWhere('match.league_id = :league_id', { league_id });
    }
    if (date) {
      qb.andWhere('DATE(match.kickoff_at) = :date', { date });
    }
    if (round) {
      qb.andWhere('match.round = :round', { round });
    }
    if (season) {
      qb.andWhere('match.season = :season', { season });
    }

    const sortColumn = sort || 'kickoff_at';
    qb.orderBy(`match.${sortColumn}`, order || 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findLive(): Promise<Match[]> {
    return this.matchRepository.find({
      where: { status: In(['live', 'halftime', 'extra_time', 'penalties']) },
      relations: ['home_team', 'away_team', 'league'],
      order: { kickoff_at: 'ASC' },
    });
  }

  async findResults(): Promise<Match[]> {
    return this.matchRepository.find({
      where: { status: 'finished' },
      relations: ['home_team', 'away_team', 'league'],
      order: { kickoff_at: 'DESC' },
      take: 50,
    });
  }

  async findSchedule(): Promise<Match[]> {
    return this.matchRepository.find({
      where: { status: 'scheduled' },
      relations: ['home_team', 'away_team', 'league'],
      order: { kickoff_at: 'ASC' },
      take: 50,
    });
  }

  async findById(id: number): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['home_team', 'away_team', 'league'],
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${id} not found`);
    }

    return match;
  }

  async findEventsByMatchId(matchId: number): Promise<MatchEvent[]> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    return this.matchEventRepository.find({
      where: { match_id: matchId },
      relations: ['team'],
      order: { minute: 'ASC', created_at: 'ASC' },
    });
  }

  async findLineupsByMatchId(matchId: number): Promise<MatchLineup[]> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException(`Match with ID ${matchId} not found`);
    }

    return this.matchLineupRepository.find({
      where: { match_id: matchId },
      relations: ['team'],
      order: { is_starter: 'DESC', position: 'ASC' },
    });
  }
}
