import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

const IGNORED_PATHS = ['/health', '/metrics', '/favicon.ico'];

@Injectable()
export class TrackingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TrackingMiddleware.name);

  constructor(private readonly dataSource: DataSource) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path;

    if (IGNORED_PATHS.some((p) => path.startsWith(p))) {
      next();
      return;
    }

    // Fire-and-forget — don't block the request
    this.trackRequest(req).catch((error) => {
      this.logger.warn(`Tracking failed: ${(error as Error).message}`);
    });

    next();
  }

  private async trackRequest(req: Request): Promise<void> {
    const userAgent = req.headers['user-agent'] || '';
    const deviceType = this.parseDeviceType(userAgent);
    const sessionId = (req.headers['x-session-id'] as string) || null;
    const userId = (req as unknown as { user?: { id: string } }).user?.id || null;

    // Respect X-Test-Country header for k6 load tests
    const testCountry = req.headers['x-test-country'] as string;
    const ipCountry = testCountry || null;

    await this.dataSource.query(
      `INSERT INTO analytics_events (user_id, session_id, event_type, event_data, ip_country, device_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        sessionId,
        'page_view',
        JSON.stringify({
          path: req.path,
          method: req.method,
          referrer: req.headers['referer'] || null,
        }),
        ipCountry,
        deviceType,
      ],
    );
  }

  private parseDeviceType(userAgent: string): string {
    if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }
}
