import { ConfigService } from '@nestjs/config';
import { KafkaConfig, SASLOptions } from 'kafkajs';

export const getKafkaConfig = (configService: ConfigService): KafkaConfig => {
  const brokers = configService
    .getOrThrow<string>('KAFKA_BROKERS')
    .split(',')
    .map((b) => b.trim());

  const isSSL = configService.get<string>('KAFKA_SSL') === 'true';

  const config: KafkaConfig = {
    clientId: 'minute93-api',
    brokers,
  };

  if (isSSL) {
    const username = configService.getOrThrow<string>('KAFKA_SASL_USERNAME');
    const password = configService.getOrThrow<string>('KAFKA_SASL_PASSWORD');

    config.ssl = true;
    config.sasl = {
      mechanism: 'scram-sha-256',
      username,
      password,
    } as SASLOptions;
  }

  return config;
};
