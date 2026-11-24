import { ValidationPipe, ArgumentMetadata } from '@nestjs/common';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { QueryTelemetryDto } from './dto/query-telemetry.dto';

describe('Telemetry DTO Validation', () => {
  let target: ValidationPipe;

  beforeEach(() => {
    target = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: CreateTelemetryDto,
    data: '',
  };

  describe('CreateTelemetryDto', () => {
    it('should validate valid payload successfully', async () => {
      const payload = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2940,
      };

      const result = await target.transform(payload, metadata);
      expect(result).toBeDefined();
      expect(result.deviceId).toBe('ESP32_001');
      expect(result.soilMoistureRaw).toBe(2940);
    });

    it('should fail when deviceId is missing', async () => {
      const payload = {
        soilMoistureRaw: 2940,
      };

      await expect(target.transform(payload, metadata)).rejects.toThrow();
    });

    it('should fail when soilMoistureRaw is negative (< 0)', async () => {
      const payload = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: -1,
      };

      await expect(target.transform(payload, metadata)).rejects.toThrow();
    });

    it('should fail when soilMoistureRaw > 4095', async () => {
      const payload = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: 4096,
      };

      await expect(target.transform(payload, metadata)).rejects.toThrow();
    });

    it('should fail when soilMoistureRaw is a floating point number', async () => {
      const payload = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2940.75,
      };

      await expect(target.transform(payload, metadata)).rejects.toThrow();
    });

    it('should fail when extra properties are passed (forbidNonWhitelisted)', async () => {
      const payload = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2940,
        fakeProperty: 'malicious',
      };

      await expect(target.transform(payload, metadata)).rejects.toThrow();
    });
  });

  describe('QueryTelemetryDto', () => {
    const queryMetadata: ArgumentMetadata = {
      type: 'query',
      metatype: QueryTelemetryDto,
      data: '',
    };

    it('should apply defaults for page and limit', async () => {
      const query = {};
      const result = await target.transform(query, queryMetadata);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should reject limit > 100', async () => {
      const query = { page: 1, limit: 200 };
      await expect(target.transform(query, queryMetadata)).rejects.toThrow();
    });

    it('should reject page < 1', async () => {
      const query = { page: 0, limit: 10 };
      await expect(target.transform(query, queryMetadata)).rejects.toThrow();
    });
  });
});

