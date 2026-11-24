import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('DB_HOST', 'localhost'),
  port: configService.get<number>('DB_PORT', 5432),
  username: configService.get<string>('DB_USER', 'smartplant_user'),
  password: configService.get<string>('DB_PASSWORD', 'smartplant_secret_2026'),
  database: configService.get<string>('DB_NAME', 'smart_plant'),
  // synchronize tuyệt đối không bật ở production (chỉ dùng migration)
  synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
  logging: configService.get<string>('DB_LOGGING') === 'true',
  autoLoadEntities: true,
  // Chuẩn bị cấu trúc migrations cho giai đoạn tiếp theo
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
});

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
};

