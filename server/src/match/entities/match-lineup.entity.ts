import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Match } from './match.entity.js';
import { Team } from '../../team/entities/team.entity.js';

@Entity('match_lineups')
@Unique(['match_id', 'team_id', 'player_name'])
export class MatchLineup {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Match)
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ type: 'integer', nullable: true })
  match_id: number | null;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'integer', nullable: true })
  team_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  player_name: string | null;

  @Column({ type: 'smallint', nullable: true })
  player_number: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  position: string | null;

  @Column({ type: 'boolean', default: true })
  is_starter: boolean;
}
