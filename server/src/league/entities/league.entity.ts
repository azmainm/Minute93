import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('leagues')
export class League {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'integer', unique: true })
  api_football_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'integer' })
  season: number;

  @Column({ type: 'text', nullable: true })
  logo_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
