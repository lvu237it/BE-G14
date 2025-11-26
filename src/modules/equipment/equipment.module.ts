import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';
import { Equipment } from 'src/entities/equipment.entity';
import { HistoryEquipment } from 'src/entities/history-equipment.entity';
import { Department } from 'src/entities/department.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { LocationEquipment } from 'src/entities/location-equipment.entity';
import { EquipmentType } from 'src/entities/equipment-type.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Equipment,
      HistoryEquipment,
      Department,
      PositionPermission,
      LocationEquipment,
      EquipmentType,
    ]),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
})
export class EquipmentModule {}
