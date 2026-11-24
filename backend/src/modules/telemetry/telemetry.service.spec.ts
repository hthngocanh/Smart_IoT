import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TelemetryService } from './telemetry.service';
import { Telemetry } from './entities/telemetry.entity';

describe('TelemetryService', () => {
  let service: TelemetryService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryService,
        {
          provide: getRepositoryToken(Telemetry),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TelemetryService>(TelemetryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save telemetry entity', async () => {
      const dto = { deviceId: 'ESP32_001', soilMoistureRaw: 2920 };
      const entity = { id: 'uuid-1', ...dto, recordedAt: new Date() };

      mockRepository.create.mockReturnValue(dto);
      mockRepository.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(mockRepository.create).toHaveBeenCalledWith(dto);
      expect(mockRepository.save).toHaveBeenCalledWith(dto);
      expect(result).toEqual(entity);
    });
  });

  describe('getLatest', () => {
    it('should query latest telemetry with order by recordedAt DESC', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 'uuid-1', deviceId: 'ESP32_001', soilMoistureRaw: 2900 }),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getLatest('ESP32_001');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('telemetry.deviceId = :deviceId', {
        deviceId: 'ESP32_001',
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('telemetry.recordedAt', 'DESC');
      expect(result?.deviceId).toBe('ESP32_001');
    });
  });

  describe('findAll', () => {
    it('should paginate and return telemetry history', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [{ id: 'uuid-1', deviceId: 'ESP32_001', soilMoistureRaw: 2900 }],
          1,
        ]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll({ page: 1, limit: 10, deviceId: 'ESP32_001' });

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });
});

