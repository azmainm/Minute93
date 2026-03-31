import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getOverview(): Promise<unknown> {
    const [userStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS new_signups_today,
        COUNT(CASE WHEN auth_provider = 'google' THEN 1 END) AS google_users,
        COUNT(CASE WHEN auth_provider = 'credentials' THEN 1 END) AS credentials_users
      FROM users
    `);

    const [trafficStats] = await this.dataSource.query(`
      SELECT
        COUNT(*) AS total_page_views,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) AS page_views_today,
        COUNT(DISTINCT session_id) AS total_sessions,
        COUNT(DISTINCT CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN session_id END) AS sessions_today
      FROM analytics_events
      WHERE event_type = 'page_view'
    `);

    return { users: userStats, traffic: trafficStats };
  }

  async getGeography(): Promise<unknown[]> {
    return this.dataSource.query(`
      SELECT
        ip_country AS country,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(*) AS page_views
      FROM analytics_events
      WHERE ip_country IS NOT NULL
      GROUP BY ip_country
      ORDER BY sessions DESC
      LIMIT 30
    `);
  }

  async getEngagement(): Promise<unknown> {
    const dailyActiveUsers = await this.dataSource.query(`
      SELECT
        DATE(created_at) AS date,
        COUNT(DISTINCT session_id) AS sessions,
        COUNT(*) AS page_views
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    const popularPages = await this.dataSource.query(`
      SELECT
        event_data->>'path' AS path,
        COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY event_data->>'path'
      ORDER BY views DESC
      LIMIT 20
    `);

    return { dailyActiveUsers, popularPages };
  }

  async getFeatureUsage(): Promise<unknown> {
    const searchQueries = await this.dataSource.query(`
      SELECT
        event_data->>'query' AS query,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'search'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY event_data->>'query'
      ORDER BY count DESC
      LIMIT 20
    `);

    const mostViewedMatches = await this.dataSource.query(`
      SELECT
        event_data->>'path' AS path,
        COUNT(*) AS views
      FROM analytics_events
      WHERE event_type = 'page_view'
        AND event_data->>'path' LIKE '/matches/%'
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY event_data->>'path'
      ORDER BY views DESC
      LIMIT 10
    `);

    const deviceBreakdown = await this.dataSource.query(`
      SELECT
        device_type,
        COUNT(*) AS count
      FROM analytics_events
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY device_type
      ORDER BY count DESC
    `);

    return { searchQueries, mostViewedMatches, deviceBreakdown };
  }

  async getSnapshots(limit: number = 30): Promise<unknown[]> {
    return this.dataSource.query(
      `SELECT * FROM daily_snapshots ORDER BY snapshot_date DESC LIMIT $1`,
      [limit],
    );
  }

  async getIncidents(limit: number = 50): Promise<unknown[]> {
    return this.dataSource.query(
      `SELECT * FROM incidents ORDER BY triggered_at DESC LIMIT $1`,
      [limit],
    );
  }

  async getLoadTestRuns(limit: number = 20): Promise<unknown[]> {
    return this.dataSource.query(
      `SELECT * FROM load_test_runs ORDER BY started_at DESC LIMIT $1`,
      [limit],
    );
  }

  async createLoadTestRun(data: {
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
  }): Promise<unknown> {
    const [row] = await this.dataSource.query(
      `INSERT INTO load_test_runs
        (test_name, started_at, virtual_users_peak, total_requests,
         requests_per_second, error_rate_pct, p50_response_ms,
         p95_response_ms, p99_response_ms, passed, notes, config_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.test_name,
        data.started_at,
        data.virtual_users_peak,
        data.total_requests,
        data.requests_per_second,
        data.error_rate_pct,
        data.p50_response_ms,
        data.p95_response_ms,
        data.p99_response_ms,
        data.passed,
        data.notes || null,
        data.config_json ? JSON.stringify(data.config_json) : null,
      ],
    );
    return row;
  }
}
