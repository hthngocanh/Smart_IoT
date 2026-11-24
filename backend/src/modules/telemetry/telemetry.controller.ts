import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { TelemetryService } from './telemetry.service';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { QueryTelemetryDto } from './dto/query-telemetry.dto';
import { QueryLatestTelemetryDto } from './dto/query-latest-telemetry.dto';

@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTelemetry(@Body() createTelemetryDto: CreateTelemetryDto) {
    const data = await this.telemetryService.create(createTelemetryDto);

    return {
      success: true,
      message: 'Telemetry received successfully',
      data: {
        id: data.id,
        deviceId: data.deviceId,
        soilMoistureRaw: data.soilMoistureRaw,
        recordedAt: data.recordedAt,
      },
    };
  }

  @Get('latest')
  async getLatestTelemetry(@Query() queryDto: QueryLatestTelemetryDto) {
    const data = await this.telemetryService.getLatest(queryDto.deviceId);

    if (!data) {
      return {
        success: true,
        message: 'No telemetry data found',
        data: null,
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        deviceId: data.deviceId,
        soilMoistureRaw: data.soilMoistureRaw,
        recordedAt: data.recordedAt,
      },
    };
  }

  @Get()
  async getTelemetryHistory(@Query() queryDto: QueryTelemetryDto) {
    const result = await this.telemetryService.findAll(queryDto);

    return {
      success: true,
      data: result.data.map((item) => ({
        id: item.id,
        deviceId: item.deviceId,
        soilMoistureRaw: item.soilMoistureRaw,
        recordedAt: item.recordedAt,
      })),
      pagination: result.pagination,
    };
  }
}

