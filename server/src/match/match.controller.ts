import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Sse,
  Logger,
} from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { MatchService } from './match.service.js';
import { MatchQueryDto } from './dto/match-query.dto.js';
import { RedisService } from '../redis/redis.service.js';

interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

@Controller('matches')
export class MatchController {
  private readonly logger = new Logger(MatchController.name);

  constructor(
    private readonly matchService: MatchService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async findAll(@Query() query: MatchQueryDto) {
    return this.matchService.findAll(query);
  }

  @Get('live')
  async findLive() {
    return this.matchService.findLive();
  }

  @Get('results')
  async findResults() {
    return this.matchService.findResults();
  }

  @Get('schedule')
  async findSchedule() {
    return this.matchService.findSchedule();
  }

  @Get(':id/stream')
  @Sse()
  streamMatchEvents(
    @Param('id', ParseIntPipe) id: number,
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Look up the match to get its api_football_id for the Redis channel
    this.matchService.findById(id).then((match) => {
      const channel = `match:${match.api_football_id}:events`;

      this.redisService.subscribe(channel, (message) => {
        subject.next({ data: message });
      });

      this.logger.debug(`SSE client connected for match ${id} (channel: ${channel})`);

      // Cleanup when client disconnects
      subject.subscribe({
        complete: () => {
          this.redisService.unsubscribe(channel);
          this.logger.debug(`SSE client disconnected from match ${id}`);
        },
      });
    }).catch((error) => {
      this.logger.error(`SSE setup failed for match ${id}: ${error.message}`);
      subject.complete();
    });

    return subject.asObservable();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const match = await this.matchService.findById(id);
    const events = await this.matchService.findEventsByMatchId(id);
    const lineups = await this.matchService.findLineupsByMatchId(id);
    return { ...match, events, lineups };
  }

  @Get(':id/events')
  async findEvents(@Param('id', ParseIntPipe) id: number) {
    return this.matchService.findEventsByMatchId(id);
  }
}
