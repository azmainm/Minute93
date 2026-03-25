import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { League } from '../../league/entities/league.entity.js';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  api_football_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  code: string | null;

  @Column({ type: 'text', nullable: true })
  logo_url: string | null;

  @ManyToOne(() => League)
  @JoinColumn({ name: 'league_id' })
  league: League;

  @Column({ type: 'integer', nullable: true })
  league_id: number | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  group_name: string | null;

  @Column({ type: 'smallint', nullable: true })
  group_position: number | null;
}
