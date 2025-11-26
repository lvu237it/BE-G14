import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationEquipment } from 'src/entities/location-equipment.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { LocationEquipmentService } from './location-equipment.service';
import { LocationEquipmentController } from './location-equipment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LocationEquipment, Equipment])],
  providers: [LocationEquipmentService],
  controllers: [LocationEquipmentController],
  exports: [LocationEquipmentService],
})
export class LocationEquipmentModule {}
