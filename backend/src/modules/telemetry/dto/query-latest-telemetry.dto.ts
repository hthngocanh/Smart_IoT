import { IsOptional, IsString } from 'class-validator';

export class QueryLatestTelemetryDto {
  @IsOptional()
  @IsString()
  deviceId?: string;
}

