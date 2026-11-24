import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  backend: {
    status: 'up';
    uptime: number;
    timestamp: string;
  };
  database: {
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    let dbStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbError: string | undefined;
    let latencyMs: number | undefined;

    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      latencyMs = Date.now() - startTime;
      dbStatus = 'connected';
    } catch (error: any) {
      dbStatus = 'disconnected';
      dbError = error?.message || 'Database connection error';
      this.logger.error(`Database health check failed: ${dbError}`);
    }

    const isHealthy = dbStatus === 'connected';

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      backend: {
        status: 'up',
        uptime,
        timestamp,
      },
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined && { latencyMs }),
        ...(dbError && { error: dbError }),
      },
    };
  }
}

