import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(@Res({ passthrough: false }) res: Response) {
    const result = await this.healthService.checkHealth();

    if (result.status === 'healthy') {
      return res.status(HttpStatus.OK).json(result);
    } else {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json(result);
    }
  }
}

