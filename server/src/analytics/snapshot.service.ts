import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(private readonly dataSource: DataSource) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async generateDailySnapshot(): Promise<void> {
    this.logger.log('Generating daily snapshot...');

    try {
      const snapshotDate = new Date();
      snapshotDate.setDate(snapshotDate.getDate() - 1);
      const dateStr = snapshotDate.toISOString().split('T')[0];

      const [userStats] = await this.dataSource.query(`
        SELECT
          COUNT(*) AS total_users,
          COUNT(CASE WHEN created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') THEN 1 END) AS new_signups
        FROM users
      `, [dateStr]);

      const [trafficStats] = await this.dataSource.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') THEN session_id END) AS daily_active_users,
          COUNT(CASE WHEN event_type = 'search' AND created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') THEN 1 END) AS searches_today,
          (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'search') AS total_searches,
          COUNT(CASE WHEN event_type = 'page_view' AND created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day') THEN 1 END) AS page_views_today,
          (SELECT COUNT(*) FROM analytics_events WHERE event_type = 'page_view') AS total_page_views
        FROM analytics_events
      `, [dateStr]);

      const topCountries = await this.dataSource.query(`
        SELECT ip_country AS country, COUNT(*) AS count
        FROM analytics_events
        WHERE ip_country IS NOT NULL
          AND created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day')
        GROUP BY ip_country
        ORDER BY count DESC
        LIMIT 10
      `, [dateStr]);

      const deviceBreakdown = await this.dataSource.query(`
        SELECT device_type, COUNT(*) AS count
        FROM analytics_events
        WHERE created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day')
        GROUP BY device_type
      `, [dateStr]);

      const [matchStats] = await this.dataSource.query(`
        SELECT COUNT(*) AS live_matches_today
        FROM matches
        WHERE kickoff_at >= $1::date AND kickoff_at < ($1::date + INTERVAL '1 day')
          AND status IN ('live', 'finished')
      `, [dateStr]);

      const topSearched = await this.dataSource.query(`
        SELECT event_data->>'query' AS query, COUNT(*) AS count
        FROM analytics_events
        WHERE event_type = 'search'
          AND created_at >= $1::date AND created_at < ($1::date + INTERVAL '1 day')
        GROUP BY event_data->>'query'
        ORDER BY count DESC
        LIMIT 5
      `, [dateStr]);

      const isMatchDay = Number(matchStats.live_matches_today) > 0;
      const notes = `${isMatchDay ? 'Match day' : 'No matches'}. ${trafficStats.page_views_today} page views. ${trafficStats.daily_active_users} unique sessions. ${userStats.new_signups} new signups.`;

      await this.dataSource.query(
        `INSERT INTO daily_snapshots
         (snapshot_date, phase, total_users, new_signups, daily_active_users,
          total_searches, searches_today, total_page_views, page_views_today,
          top_countries, device_breakdown, top_searched_players, live_matches_today, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (snapshot_date) DO UPDATE SET
           total_users = EXCLUDED.total_users,
           new_signups = EXCLUDED.new_signups,
           daily_active_users = EXCLUDED.daily_active_users,
           total_searches = EXCLUDED.total_searches,
           searches_today = EXCLUDED.searches_today,
           total_page_views = EXCLUDED.total_page_views,
           page_views_today = EXCLUDED.page_views_today,
           top_countries = EXCLUDED.top_countries,
           device_breakdown = EXCLUDED.device_breakdown,
           top_searched_players = EXCLUDED.top_searched_players,
           live_matches_today = EXCLUDED.live_matches_today,
           notes = EXCLUDED.notes`,
        [
          dateStr,
          'testing',
          userStats.total_users,
          userStats.new_signups,
          trafficStats.daily_active_users,
          trafficStats.total_searches,
          trafficStats.searches_today,
          trafficStats.total_page_views,
          trafficStats.page_views_today,
          JSON.stringify(topCountries),
          JSON.stringify(deviceBreakdown),
          JSON.stringify(topSearched),
          matchStats.live_matches_today,
          notes,
        ],
      );

      this.logger.log(`Daily snapshot generated for ${dateStr}: ${notes}`);
    } catch (error) {
      this.logger.error(`Snapshot generation failed: ${(error as Error).message}`);
    }
  }
}
