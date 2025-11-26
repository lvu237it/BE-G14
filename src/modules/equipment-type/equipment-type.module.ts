import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentType } from 'src/entities/equipment-type.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { EquipmentTypeService } from './equipment-type.service';
import { EquipmentTypeController } from './equipment-type.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentType, Equipment])],
  providers: [EquipmentTypeService],
  controllers: [EquipmentTypeController],
  exports: [EquipmentTypeService],
})
export class EquipmentTypeModule {}
