import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { League } from '../../league/entities/league.entity.js';
import { Team } from '../../team/entities/team.entity.js';

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  api_football_id: number;

  @ManyToOne(() => League)
  @JoinColumn({ name: 'league_id' })
  league: League;

  @Column({ type: 'integer', nullable: true })
  league_id: number | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'home_team_id' })
  home_team: Team;

  @Column({ type: 'integer', nullable: true })
  home_team_id: number | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'away_team_id' })
  away_team: Team;

  @Column({ type: 'integer', nullable: true })
  away_team_id: number | null;

  @Column({ type: 'smallint', nullable: true })
  home_score: number | null;

  @Column({ type: 'smallint', nullable: true })
  away_score: number | null;

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status: string;

  @Column({ type: 'integer', default: 2024 })
  season: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  round: string | null;

  @Column({ type: 'timestamptz' })
  kickoff_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  venue: string | null;

  @Column({ type: 'jsonb', nullable: true })
  statistics: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  updated_at: Date;
}
