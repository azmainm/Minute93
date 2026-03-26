import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { League } from './entities/league.entity.js';

@Injectable()
export class LeagueService {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<League[]> {
    return this.leagueRepository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async getStandings(leagueId?: number, season?: number): Promise<unknown[]> {
    const query = `
      SELECT id, name, code, logo_url, group_name, season,
             played, wins, draws, losses,
             goals_for, goals_against, goal_difference, points
      FROM mv_standings
      WHERE ($1::int IS NULL OR league_id = $1)
        AND ($2::int IS NULL OR season = $2)
      ORDER BY group_name ASC NULLS LAST, points DESC, goal_difference DESC
    `;

    return this.dataSource.query(query, [leagueId || null, season || null]);
  }

  async getTopScorers(limit: number = 20, season?: number): Promise<unknown[]> {
    const query = `
      SELECT name, team_name, team_logo, goals, season
      FROM mv_top_scorers
      WHERE ($1::int IS NULL OR season = $1)
      ORDER BY goals DESC
      LIMIT $2
    `;

    return this.dataSource.query(query, [season || null, limit]);
  }
}
