import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import { QualityAssessmentBallotService } from './quality-assesment-ballot.service';
import { QualityAssessmentBallotController } from './quality-assesment-ballot.controller';
import { QualityAssessmentItem } from 'src/entities/quality-assessment-item.entity';
import {
  Department,
  Equipment,
  MaterialSupplyBallot,
  Position,
  PositionPermission,
  User,
} from 'src/entities';
import { WorkItemModule } from '../work-item/work-item.module';
import { HistoryRepairModule } from '../history-repair/history-repair.module';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { Material } from 'src/entities/material.entity';
import { SettlementRepairMaterial } from 'src/entities/settlement-repair-material.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QualityAssessmentBallot,
      QualityAssessmentItem,
      User,
      Position,
      PositionPermission,
      SettlementRepairBallot,
      Department,
      Equipment,
      MaterialSupplyBallot,
      Material,
      SettlementRepairMaterial,
      RepairRequest
    ]),
    WorkItemModule,
    HistoryRepairModule,
  ],
  controllers: [QualityAssessmentBallotController],
  providers: [QualityAssessmentBallotService],
})
export class QualityAssessmentBallotModule {}
