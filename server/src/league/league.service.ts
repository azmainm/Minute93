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
      SELECT t.id, t.name, t.code, t.logo_url,
             s.group_name, s.season, s.rank,
             s.played, s.wins, s.draws, s.losses,
             s.goals_for, s.goals_against, s.goal_difference, s.points, s.form
      FROM standings s
      INNER JOIN teams t ON s.team_id = t.id
      WHERE ($1::int IS NULL OR s.league_id = $1)
        AND ($2::int IS NULL OR s.season = $2)
      ORDER BY s.group_name ASC NULLS LAST, s.rank ASC
    `;

    return this.dataSource.query(query, [leagueId || null, season || null]);
  }

  async getTopScorers(limit: number = 20, season?: number, leagueId?: number): Promise<unknown[]> {
    const query = `
      SELECT ts.name, ts.team_name, ts.team_logo, ts.goals, ts.season
      FROM mv_top_scorers ts
      LEFT JOIN teams t ON ts.team_id = t.id
      WHERE ($1::int IS NULL OR ts.season = $1)
        AND ($3::int IS NULL OR t.league_id = $3)
      ORDER BY ts.goals DESC
      LIMIT $2
    `;

    return this.dataSource.query(query, [season || null, limit, leagueId || null]);
  }
}
