import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { RepairRequestService } from './repair-request.service';
import { RepairRequestController } from './repair-request.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RepairRequest, Equipment, MaterialSupplyBallot])],
  controllers: [RepairRequestController],
  providers: [RepairRequestService],
  exports: [RepairRequestService],
})
export class RepairRequestModule {}
