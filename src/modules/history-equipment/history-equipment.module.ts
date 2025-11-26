import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryEquipment } from 'src/entities/history-equipment.entity';
import { HistoryEquipmentController } from './history-equipment.controller';
import { HistoryEquipmentService } from './history-equipment.service';

@Module({
  imports: [TypeOrmModule.forFeature([HistoryEquipment])],
  controllers: [HistoryEquipmentController],
  providers: [HistoryEquipmentService],
})
export class HistoryEquipmentModule {}


