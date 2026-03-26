import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('geography')
  async getGeography() {
    return this.analyticsService.getGeography();
  }

  @Get('engagement')
  async getEngagement() {
    return this.analyticsService.getEngagement();
  }

  @Get('features')
  async getFeatureUsage() {
    return this.analyticsService.getFeatureUsage();
  }

  @Get('snapshots')
  async getSnapshots(@Query('limit') limit?: string) {
    return this.analyticsService.getSnapshots(limit ? Number(limit) : 30);
  }

  @Get('incidents')
  async getIncidents(@Query('limit') limit?: string) {
    return this.analyticsService.getIncidents(limit ? Number(limit) : 50);
  }

  @Get('load-tests')
  async getLoadTestRuns(@Query('limit') limit?: string) {
    return this.analyticsService.getLoadTestRuns(limit ? Number(limit) : 20);
  }
}
