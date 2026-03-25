import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  avatar_url: string | null;

  @Column({ type: 'varchar', length: 20, default: 'credentials' })
  auth_provider: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  favorite_team: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  country_code: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string | null;

  @Column({ type: 'boolean', default: false })
  is_admin: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_login_at: Date | null;
}
