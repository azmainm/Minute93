import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Team } from '../../team/entities/team.entity.js';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  api_football_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ManyToOne(() => Team)
  @JoinColumn({ name: 'team_id' })
  team: Team;

  @Column({ type: 'integer', nullable: true })
  team_id: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  position: string | null;

  @Column({ type: 'smallint', nullable: true })
  number: number | null;

  @Column({ type: 'text', nullable: true })
  photo_url: string | null;
}
