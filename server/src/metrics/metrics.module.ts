import { Global, Module } from '@nestjs/common';
import { MetricsService } from './metrics.service.js';
import { MetricsController } from './metrics.controller.js';
import { PrometheusInterceptor } from './prometheus.interceptor.js';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, PrometheusInterceptor],
  exports: [MetricsService],
})
export class MetricsModule {}
