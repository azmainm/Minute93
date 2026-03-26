import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service.js';

@Injectable()
export class PrometheusInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path || request.path;

    const startTime = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = String(response.statusCode);
          const durationSeconds = (performance.now() - startTime) / 1000;

          this.metricsService.httpRequestDuration
            .labels(method, route, statusCode)
            .observe(durationSeconds);

          this.metricsService.httpRequestsTotal
            .labels(method, route, statusCode)
            .inc();
        },
        error: (error) => {
          const statusCode = String(error.status || 500);
          const durationSeconds = (performance.now() - startTime) / 1000;

          this.metricsService.httpRequestDuration
            .labels(method, route, statusCode)
            .observe(durationSeconds);

          this.metricsService.httpRequestsTotal
            .labels(method, route, statusCode)
            .inc();
        },
      }),
    );
  }
}
