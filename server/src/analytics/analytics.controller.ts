import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
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

  @Post('load-tests')
  async createLoadTestRun(@Body() body: {
    test_name: string;
    started_at: string;
    virtual_users_peak: number;
    total_requests: number;
    requests_per_second: number;
    error_rate_pct: number;
    p50_response_ms: number;
    p95_response_ms: number;
    p99_response_ms: number;
    passed: boolean;
    notes?: string;
    config_json?: Record<string, unknown>;
  }) {
    return this.analyticsService.createLoadTestRun(body);
  }
}
