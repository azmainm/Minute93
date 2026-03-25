import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Match } from './match.entity.js';
import { Team } from '../../team/entities/team.entity.js';

@Entity('match_events')
export class MatchEvent {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ type: 'integer', nullable: true })
  match_id: number | null;

  @Column({ type: 'varchar', length: 20 })
  event_type: string;

  @Column({ type: 'smallint', nullable: true })
  minute: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  player_name: string | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'integer', nullable: true })
  team_id: number | null;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
