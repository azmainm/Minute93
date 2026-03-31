import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { DataSource } from 'typeorm';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async search(@Query() query: SearchQueryDto, @Req() req: Request) {
    const result = await this.searchService.search(query.q, query.limit);

    // Track search event for analytics (fire-and-forget)
    const sessionId = (req.headers['x-session-id'] as string) || null;
    this.dataSource
      .query(
        `INSERT INTO analytics_events (session_id, event_type, event_data, device_type)
         VALUES ($1, $2, $3, $4)`,
        [
          sessionId,
          'search',
          JSON.stringify({ query: query.q }),
          'desktop',
        ],
      )
      .catch(() => {});

    return result;
  }
}
