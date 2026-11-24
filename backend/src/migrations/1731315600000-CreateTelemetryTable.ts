import { MigrationInterface, QueryRunner, Table, TableIndex, TableCheck } from 'typeorm';

export class CreateTelemetryTable1731315600000 implements MigrationInterface {
  name = 'CreateTelemetryTable1731315600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo bảng telemetry
    await queryRunner.createTable(
      new Table({
        name: 'telemetry',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'device_id',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'soil_moisture_raw',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'recorded_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Ràng buộc giới hạn ADC: 0 - 4095
    await queryRunner.createCheckConstraint(
      'telemetry',
      new TableCheck({
        name: 'chk_telemetry_soil_moisture_raw',
        expression: '"soil_moisture_raw" >= 0 AND "soil_moisture_raw" <= 4095',
      }),
    );

    // Tạo Index theo device_id
    await queryRunner.createIndex(
      'telemetry',
      new TableIndex({
        name: 'idx_telemetry_device_id',
        columnNames: ['device_id'],
      }),
    );

    // Tạo Index theo recorded_at
    await queryRunner.createIndex(
      'telemetry',
      new TableIndex({
        name: 'idx_telemetry_recorded_at',
        columnNames: ['recorded_at'],
      }),
    );

    // Tạo Index hỗn hợp tối ưu truy vấn thời gian theo thiết bị
    await queryRunner.createIndex(
      'telemetry',
      new TableIndex({
        name: 'idx_telemetry_device_recorded',
        columnNames: ['device_id', 'recorded_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('telemetry', 'idx_telemetry_device_recorded');
    await queryRunner.dropIndex('telemetry', 'idx_telemetry_recorded_at');
    await queryRunner.dropIndex('telemetry', 'idx_telemetry_device_id');
    await queryRunner.dropTable('telemetry', true);
  }
}

