import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;

  // Histograms
  readonly httpRequestDuration: client.Histogram;
  readonly pollerCycleDuration: client.Histogram;

  // Counters
  readonly httpRequestsTotal: client.Counter;
  readonly cacheHits: client.Counter;
  readonly cacheMisses: client.Counter;
  readonly kafkaMessagesProduced: client.Counter;
  readonly kafkaMessagesConsumed: client.Counter;

  // Gauges
  readonly activeSseConnections: client.Gauge;
  readonly kafkaConsumerLag: client.Gauge;

  constructor(private readonly configService: ConfigService) {
    this.register = new client.Registry();

    this.register.setDefaultLabels({
      app: 'minute93',
    });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.register],
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.pollerCycleDuration = new client.Histogram({
      name: 'poller_cycle_duration_seconds',
      help: 'Duration of API-Football polling cycles',
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [this.register],
    });

    this.cacheHits = new client.Counter({
      name: 'redis_cache_hits_total',
      help: 'Total Redis cache hits',
      registers: [this.register],
    });

    this.cacheMisses = new client.Counter({
      name: 'redis_cache_misses_total',
      help: 'Total Redis cache misses',
      registers: [this.register],
    });

    this.kafkaMessagesProduced = new client.Counter({
      name: 'kafka_messages_produced_total',
      help: 'Total Kafka messages produced',
      labelNames: ['topic'],
      registers: [this.register],
    });

    this.kafkaMessagesConsumed = new client.Counter({
      name: 'kafka_messages_consumed_total',
      help: 'Total Kafka messages consumed',
      labelNames: ['consumer_group'],
      registers: [this.register],
    });

    this.activeSseConnections = new client.Gauge({
      name: 'active_sse_connections',
      help: 'Number of active SSE connections',
      registers: [this.register],
    });

    this.kafkaConsumerLag = new client.Gauge({
      name: 'kafka_consumer_lag_ms',
      help: 'Kafka consumer lag in milliseconds',
      labelNames: ['consumer_group'],
      registers: [this.register],
    });
  }

  async onModuleInit() {
    client.collectDefaultMetrics({ register: this.register });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
