import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer, EachMessagePayload } from 'kafkajs';
import { getKafkaConfig } from '../config/kafka.config.js';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const config = getKafkaConfig(this.configService);
    this.kafka = new Kafka(config);
    this.producer = this.kafka.producer();

    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (error) {
      this.logger.error(
        `Kafka producer connection failed: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
    for (const [groupId, consumer] of this.consumers) {
      await consumer.disconnect();
      this.logger.log(`Kafka consumer ${groupId} disconnected`);
    }
  }

  async produce(topic: string, message: { key: string; value: string }): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [message],
      });
    } catch (error) {
      this.logger.error(
        `Failed to produce message to ${topic}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async consume(
    groupId: string,
    topic: string,
    handler: (payload: EachMessagePayload) => Promise<void>,
  ): Promise<void> {
    const consumer = this.kafka.consumer({ groupId });

    try {
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });
      await consumer.run({
        eachMessage: async (payload) => {
          try {
            await handler(payload);
          } catch (error) {
            this.logger.error(
              `Consumer ${groupId} error processing message: ${(error as Error).message}`,
            );
          }
        },
      });

      this.consumers.set(groupId, consumer);
      this.logger.log(`Kafka consumer ${groupId} subscribed to ${topic}`);
    } catch (error) {
      this.logger.error(
        `Kafka consumer ${groupId} failed to connect: ${(error as Error).message}`,
      );
    }
  }

  getTopic(): string {
    return this.configService.get<string>('KAFKA_TOPIC') || 'match.events';
  }
}
