import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { TrackingMiddleware } from './tracking.middleware.js';
import { SnapshotService } from './snapshot.service.js';
import { IncidentController } from './incident.controller.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [AnalyticsController, IncidentController],
  providers: [AnalyticsService, TrackingMiddleware, SnapshotService],
  exports: [TrackingMiddleware],
})
export class AnalyticsModule {}
