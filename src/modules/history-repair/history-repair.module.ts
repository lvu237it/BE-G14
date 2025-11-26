import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryRepair } from 'src/entities/history-repair.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { HistoryRepairController } from './history-repair.controller';
import { HistoryRepairService } from './history-repair.service';
import { RepairWorkflowService } from './repair-workflow.service';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { Equipment } from 'src/entities';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import { Position } from 'src/entities/position.entity';
import { User } from 'src/entities/user.entity';
import { WorkItem } from 'src/entities/work-item.entity';
import { WorkItemModule } from '../work-item/work-item.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HistoryRepair,
      MaterialSupplyBallot,
      MaterialSupplyBallotDetail,
      RepairRequest,
      Equipment,
      TechnicalAppraisalBallot,
      DetailAppraisalBallot,
      AssignmentBallot,
      AcceptanceRepairBallot,
      SettlementRepairBallot,
      QualityAssessmentBallot,
      Position,
      User,
      WorkItem,
    ]),
    forwardRef(() => WorkItemModule),
  ],
  providers: [HistoryRepairService, RepairWorkflowService],
  controllers: [HistoryRepairController],
  exports: [HistoryRepairService, RepairWorkflowService],
})
export class HistoryRepairModule {}
