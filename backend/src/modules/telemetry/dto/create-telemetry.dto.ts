import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTelemetryDto {
  @IsNotEmpty({ message: 'deviceId không được để trống' })
  @IsString({ message: 'deviceId phải là chuỗi ký tự' })
  @MaxLength(100, { message: 'deviceId không được vượt quá 100 ký tự' })
  deviceId: string;

  @IsNotEmpty({ message: 'soilMoistureRaw không được để trống' })
  @IsInt({ message: 'soilMoistureRaw phải là số nguyên' })
  @Min(0, { message: 'soilMoistureRaw tối thiểu là 0' })
  @Max(4095, { message: 'soilMoistureRaw tối đa là 4095' })
  soilMoistureRaw: number;
}

