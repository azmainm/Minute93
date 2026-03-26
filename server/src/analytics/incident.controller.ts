import { Body, Controller, Post, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

interface GrafanaAlert {
  status: string;
  alerts: Array<{
    status: string;
    labels: Record<string, string>;
    annotations: Record<string, string>;
    startsAt: string;
    endsAt: string;
    values: Record<string, number>;
  }>;
}

@Controller('admin/incidents')
export class IncidentController {
  private readonly logger = new Logger(IncidentController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Post()
  async handleGrafanaWebhook(@Body() payload: GrafanaAlert) {
    for (const alert of payload.alerts || []) {
      try {
        if (alert.status === 'firing') {
          await this.createIncident(alert);
        } else if (alert.status === 'resolved') {
          await this.resolveIncident(alert);
        }
      } catch (error) {
        this.logger.error(`Failed to process alert: ${(error as Error).message}`);
      }
    }

    return { success: true, processed: payload.alerts?.length || 0 };
  }

  private async createIncident(alert: GrafanaAlert['alerts'][0]): Promise<void> {
    const metricName = alert.labels['alertname'] || 'unknown';
    const severity = alert.labels['severity'] || 'warning';
    const thresholdValue = alert.annotations['threshold']
      ? Number(alert.annotations['threshold'])
      : null;
    const actualValue = Object.values(alert.values || {})[0] || null;

    const description = `${metricName} alert fired: ${alert.annotations['summary'] || alert.annotations['description'] || 'No description'}`;

    await this.dataSource.query(
      `INSERT INTO incidents (severity, metric_name, threshold_value, actual_value, triggered_at, auto_description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [severity, metricName, thresholdValue, actualValue, alert.startsAt, description],
    );

    this.logger.warn(`Incident created: ${description}`);
  }

  private async resolveIncident(alert: GrafanaAlert['alerts'][0]): Promise<void> {
    const metricName = alert.labels['alertname'] || 'unknown';

    await this.dataSource.query(
      `UPDATE incidents
       SET resolved_at = $1,
           duration_seconds = EXTRACT(EPOCH FROM ($1::timestamptz - triggered_at))::integer
       WHERE metric_name = $2 AND resolved_at IS NULL`,
      [alert.endsAt, metricName],
    );

    this.logger.log(`Incident resolved: ${metricName}`);
  }
}
