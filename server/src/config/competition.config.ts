import { ConfigService } from '@nestjs/config';

export interface LeagueConfig {
  id: number;
  name: string;
  season: number;
}

export const KNOWN_LEAGUES: Record<number, string> = {
  2: 'Champions League',
  39: 'Premier League',
  140: 'La Liga',
  1: 'FIFA World Cup',
};

export function getActiveLeagues(configService: ConfigService): LeagueConfig[] {
  const raw = configService.get<string>('ACTIVE_LEAGUES') || '39,140,2';
  return raw.split(',').map((idStr) => {
    const id = Number(idStr.trim());
    return {
      id,
      name: KNOWN_LEAGUES[id] || `League ${id}`,
      season: new Date().getFullYear(),
    };
  });
}
