import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '7d';

  @IsString()
  REDIS_URL: string;

  @IsString()
  KAFKA_BROKERS: string;

  @IsString()
  @IsOptional()
  KAFKA_TOPIC: string = 'match.events';

  @IsString()
  @IsOptional()
  KAFKA_SSL: string;

  @IsString()
  @IsOptional()
  KAFKA_SASL_USERNAME: string;

  @IsString()
  @IsOptional()
  KAFKA_SASL_PASSWORD: string;

  @IsString()
  @IsOptional()
  CLIENT_URL: string = 'http://localhost:3001';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }
  return validatedConfig;
}
