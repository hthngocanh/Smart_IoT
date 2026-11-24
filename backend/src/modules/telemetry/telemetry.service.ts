import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telemetry } from './entities/telemetry.entity';
import { CreateTelemetryDto } from './dto/create-telemetry.dto';
import { QueryTelemetryDto } from './dto/query-telemetry.dto';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(
    @InjectRepository(Telemetry)
    private readonly telemetryRepository: Repository<Telemetry>,
  ) {}

  async create(createTelemetryDto: CreateTelemetryDto): Promise<Telemetry> {
    const telemetry = this.telemetryRepository.create({
      deviceId: createTelemetryDto.deviceId,
      soilMoistureRaw: createTelemetryDto.soilMoistureRaw,
    });

    const saved = await this.telemetryRepository.save(telemetry);
    this.logger.log(
      `Saved telemetry from ${saved.deviceId}: raw=${saved.soilMoistureRaw} at ${saved.recordedAt}`,
    );
    return saved;
  }

  async getLatest(deviceId?: string): Promise<Telemetry | null> {
    const query = this.telemetryRepository.createQueryBuilder('telemetry');

    if (deviceId) {
      query.where('telemetry.deviceId = :deviceId', { deviceId });
    }

    query.orderBy('telemetry.recordedAt', 'DESC');
    return query.getOne();
  }

  async findAll(queryDto: QueryTelemetryDto): Promise<{
    data: Telemetry[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 10;
    const skip = (page - 1) * limit;

    const query = this.telemetryRepository.createQueryBuilder('telemetry');

    if (queryDto.deviceId) {
      query.where('telemetry.deviceId = :deviceId', { deviceId: queryDto.deviceId });
    }

    query.orderBy('telemetry.recordedAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

