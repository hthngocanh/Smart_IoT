import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HttpStatus } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return 200 OK when system is healthy', async () => {
    const healthyResult = {
      status: 'healthy' as const,
      backend: { status: 'up' as const, uptime: 10, timestamp: '2026-11-11T08:00:00Z' },
      database: { status: 'connected' as const, latencyMs: 5 },
    };

    mockHealthService.checkHealth.mockResolvedValue(healthyResult);

    const mockResponse: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await controller.getHealth(mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(mockResponse.json).toHaveBeenCalledWith(healthyResult);
  });

  it('should return 503 SERVICE_UNAVAILABLE when database is disconnected', async () => {
    const unhealthyResult = {
      status: 'unhealthy' as const,
      backend: { status: 'up' as const, uptime: 10, timestamp: '2026-11-11T08:00:00Z' },
      database: { status: 'disconnected' as const, error: 'Connection refused' },
    };

    mockHealthService.checkHealth.mockResolvedValue(unhealthyResult);

    const mockResponse: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await controller.getHealth(mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(mockResponse.json).toHaveBeenCalledWith(unhealthyResult);
  });
});

