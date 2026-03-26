import { Module } from '@nestjs/common';
import { PollerService } from './poller.service.js';

@Module({
  providers: [PollerService],
})
export class PollerModule {}
