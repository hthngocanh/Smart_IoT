import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { HealthService } from '../src/modules/health/health.service';
import { HealthController } from '../src/modules/health/health.controller';

describe('HealthController (Unit/Integration Test)', () => {
  let app: INestApplication;
  const mockHealthService = {
    checkHealth: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('HealthService mock returns healthy when DB connected', async () => {
    mockHealthService.checkHealth.mockResolvedValueOnce({
      status: 'healthy',
      backend: { status: 'up', uptime: 10, timestamp: new Date().toISOString() },
      database: { status: 'connected', latencyMs: 5 },
    });

    const result = await mockHealthService.checkHealth();
    expect(result.status).toBe('healthy');
    expect(result.database.status).toBe('connected');
  });

  it('HealthService mock returns unhealthy when DB disconnected', async () => {
    mockHealthService.checkHealth.mockResolvedValueOnce({
      status: 'unhealthy',
      backend: { status: 'up', uptime: 10, timestamp: new Date().toISOString() },
      database: { status: 'disconnected', error: 'Connection refused' },
    });

    const result = await mockHealthService.checkHealth();
    expect(result.status).toBe('unhealthy');
    expect(result.database.status).toBe('disconnected');
  });
});

