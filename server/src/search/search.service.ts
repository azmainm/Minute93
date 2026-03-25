import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../player/entities/player.entity.js';
import { Team } from '../team/entities/team.entity.js';

export interface SearchResult {
  type: 'player' | 'team';
  id: number;
  name: string;
  meta: string | null;
  similarity: number;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepository: Repository<Player>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const playerResults = await this.playerRepository
      .createQueryBuilder('player')
      .leftJoinAndSelect('player.team', 'team')
      .select([
        'player.id AS id',
        'player.name AS name',
        'team.name AS meta',
        `similarity(player.name, :query) AS similarity`,
      ])
      .where('player.name % :query', { query })
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .getRawMany();

    const teamResults = await this.teamRepository
      .createQueryBuilder('team')
      .select([
        'team.id AS id',
        'team.name AS name',
        'team.code AS meta',
        `similarity(team.name, :query) AS similarity`,
      ])
      .where('team.name % :query', { query })
      .orderBy('similarity', 'DESC')
      .limit(limit)
      .getRawMany();

    const combined: SearchResult[] = [
      ...playerResults.map((r: Record<string, unknown>) => ({
        type: 'player' as const,
        id: r.id as number,
        name: r.name as string,
        meta: r.meta as string | null,
        similarity: parseFloat(r.similarity as string),
      })),
      ...teamResults.map((r: Record<string, unknown>) => ({
        type: 'team' as const,
        id: r.id as number,
        name: r.name as string,
        meta: r.meta as string | null,
        similarity: parseFloat(r.similarity as string),
      })),
    ];

    combined.sort((a, b) => b.similarity - a.similarity);
    return combined.slice(0, limit);
  }
}
