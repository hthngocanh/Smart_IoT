import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Check,
} from 'typeorm';

@Entity('telemetry')
@Check(`"soil_moisture_raw" >= 0 AND "soil_moisture_raw" <= 4095`)
@Index('idx_telemetry_device_id', ['deviceId'])
@Index('idx_telemetry_recorded_at', ['recordedAt'])
@Index('idx_telemetry_device_recorded', ['deviceId', 'recordedAt'])
export class Telemetry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, name: 'device_id' })
  deviceId: string;

  @Column({ type: 'integer', name: 'soil_moisture_raw' })
  soilMoistureRaw: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'recorded_at',
  })
  recordedAt: Date;
}

