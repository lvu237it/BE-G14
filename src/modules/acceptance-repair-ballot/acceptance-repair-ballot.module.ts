import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkItem,
  User,
  Position,
  PositionPermission,
  Department,
  Equipment,
  DetailAppraisalBallot,
} from 'src/entities';
import { WorkItemModule } from '../work-item/work-item.module';
import { HistoryRepairModule } from '../history-repair/history-repair.module';
import { AcceptanceRepairBallotController } from './acceptance-repair-ballot.controller';
import { AcceptanceRepairBallotService } from './acceptance-repair-ballot.service';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { HistoryRepair } from 'src/entities/history-repair.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AcceptanceRepairBallot,
      WorkItem,
      User,
      Position,
      PositionPermission,
      QualityAssessmentBallot,
      MaterialSupplyBallot,
      Department,
      Equipment,
      RepairRequest,
      DetailAppraisalBallot,
      HistoryRepair
    ]),
    forwardRef(() => WorkItemModule),
    HistoryRepairModule,
  ],
  controllers: [AcceptanceRepairBallotController],
  providers: [AcceptanceRepairBallotService],
})
export class AcceptanceRepairBallotModule {}
