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

  async getStandings(leagueId?: number): Promise<unknown[]> {
    const query = `
      SELECT
        t.id,
        t.name,
        t.code,
        t.logo_url,
        t.group_name,
        COUNT(CASE WHEN
          (m.home_team_id = t.id AND m.home_score > m.away_score) OR
          (m.away_team_id = t.id AND m.away_score > m.home_score)
        THEN 1 END) AS wins,
        COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END) AS draws,
        COUNT(CASE WHEN
          (m.home_team_id = t.id AND m.home_score < m.away_score) OR
          (m.away_team_id = t.id AND m.away_score < m.home_score)
        THEN 1 END) AS losses,
        COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score
                            WHEN m.away_team_id = t.id THEN m.away_score END), 0) AS goals_for,
        COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score
                            WHEN m.away_team_id = t.id THEN m.home_score END), 0) AS goals_against,
        COUNT(m.id) AS played,
        (COUNT(CASE WHEN
          (m.home_team_id = t.id AND m.home_score > m.away_score) OR
          (m.away_team_id = t.id AND m.away_score > m.home_score)
        THEN 1 END) * 3 +
        COUNT(CASE WHEN m.home_score = m.away_score THEN 1 END)) AS points
      FROM teams t
      LEFT JOIN matches m ON (m.home_team_id = t.id OR m.away_team_id = t.id)
        AND m.status = 'finished'
      WHERE ($1::int IS NULL OR t.league_id = $1)
      GROUP BY t.id, t.name, t.code, t.logo_url, t.group_name
      ORDER BY t.group_name ASC NULLS LAST, points DESC,
        (COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score
                            WHEN m.away_team_id = t.id THEN m.away_score END), 0) -
         COALESCE(SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score
                            WHEN m.away_team_id = t.id THEN m.home_score END), 0)) DESC
    `;

    return this.dataSource.query(query, [leagueId || null]);
  }

  async getTopScorers(limit: number = 20): Promise<unknown[]> {
    const query = `
      SELECT
        me.player_name AS name,
        t.name AS team_name,
        t.logo_url AS team_logo,
        COUNT(*) AS goals
      FROM match_events me
      LEFT JOIN teams t ON me.team_id = t.id
      WHERE me.event_type = 'goal'
      GROUP BY me.player_name, t.name, t.logo_url
      ORDER BY goals DESC
      LIMIT $1
    `;

    return this.dataSource.query(query, [limit]);
  }
}
