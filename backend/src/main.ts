import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const globalPrefix = configService.get<string>('GLOBAL_PREFIX', 'api/v1');

  // Cấu hình Global Prefix
  app.setGlobalPrefix(globalPrefix);

  // Cấu hình CORS để phục vụ React Dashboard ở giai đoạn tiếp theo
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Cấu hình ValidationPipe toàn cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(`  SMART PLANT IOT BACKEND IS RUNNING`);
  logger.log(`  Environment : ${configService.get<string>('NODE_ENV', 'development')}`);
  logger.log(`  Port        : ${port}`);
  logger.log(`  Health API  : http://localhost:${port}/${globalPrefix}/health`);
  logger.log(`=======================================================`);
}

bootstrap();

