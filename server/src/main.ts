import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { globalValidationPipe } from './common/pipes/validation.pipe.js';
import { PrometheusInterceptor } from './metrics/prometheus.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const prometheusInterceptor = app.get(PrometheusInterceptor);

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(), prometheusInterceptor);

  const clientUrl = configService.get<string>('CLIENT_URL') || 'http://localhost:3001';
  const corsOrigins = [clientUrl];
  // Accept both www and non-www variants
  if (clientUrl.includes('://www.')) {
    corsOrigins.push(clientUrl.replace('://www.', '://'));
  } else if (clientUrl.includes('://') && !clientUrl.includes('localhost')) {
    corsOrigins.push(clientUrl.replace('://', '://www.'));
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`Minute93 API running on port ${port}`);
}
bootstrap();
