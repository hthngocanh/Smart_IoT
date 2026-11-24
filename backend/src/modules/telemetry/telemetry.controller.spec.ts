import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';

describe('TelemetryController', () => {
  let controller: TelemetryController;
  let service: TelemetryService;

  const mockTelemetryService = {
    create: jest.fn(),
    getLatest: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryController],
      providers: [
        {
          provide: TelemetryService,
          useValue: mockTelemetryService,
        },
      ],
    }).compile();

    controller = module.get<TelemetryController>(TelemetryController);
    service = module.get<TelemetryService>(TelemetryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTelemetry (POST /telemetry)', () => {
    it('should save and return telemetry record', async () => {
      const dto: CreateTelemetryDto = {
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2940,
      };

      const now = new Date();
      const mockResult = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2940,
        recordedAt: now,
      };

      mockTelemetryService.create.mockResolvedValueOnce(mockResult);

      const response = await controller.createTelemetry(dto);

      expect(response.success).toBe(true);
      expect(response.message).toBe('Telemetry received successfully');
      expect(response.data.deviceId).toBe('ESP32_001');
      expect(response.data.soilMoistureRaw).toBe(2940);
      expect(mockTelemetryService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('getLatestTelemetry (GET /telemetry/latest)', () => {
    it('should return latest record when exists', async () => {
      const mockRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        deviceId: 'ESP32_001',
        soilMoistureRaw: 2950,
        recordedAt: new Date(),
      };

      mockTelemetryService.getLatest.mockResolvedValueOnce(mockRecord);

      const response = await controller.getLatestTelemetry({ deviceId: 'ESP32_001' });

      expect(response.success).toBe(true);
      expect(response.data?.deviceId).toBe('ESP32_001');
      expect(response.data?.soilMoistureRaw).toBe(2950);
    });

    it('should return null when no record exists', async () => {
      mockTelemetryService.getLatest.mockResolvedValueOnce(null);

      const response = await controller.getLatestTelemetry({});

      expect(response.success).toBe(true);
      expect(response.message).toBe('No telemetry data found');
      expect(response.data).toBeNull();
    });
  });

  describe('getTelemetryHistory (GET /telemetry)', () => {
    it('should return paginated telemetry list', async () => {
      const mockResult = {
        data: [
          {
            id: 'id-1',
            deviceId: 'ESP32_001',
            soilMoistureRaw: 2900,
            recordedAt: new Date(),
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      };

      mockTelemetryService.findAll.mockResolvedValueOnce(mockResult);

      const response = await controller.getTelemetryHistory({ page: 1, limit: 10 });

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.pagination.total).toBe(1);
    });
  });
});

