import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmAsyncConfig } from './config/database.config';
import { HealthModule } from './modules/health/health.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    TypeOrmModule.forRootAsync(typeOrmAsyncConfig),
    HealthModule,
    TelemetryModule,
  ],
})
export class AppModule {}

