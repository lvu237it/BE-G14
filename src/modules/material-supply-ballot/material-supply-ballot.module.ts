import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, WorkItem } from 'src/entities';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { DetailAppraisalBallotItem } from 'src/entities/detail-appraisal-ballot-item.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { Position } from 'src/entities/position.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { AssignmentBallotApproval } from 'src/entities/assignment-ballot-approval.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { Department } from 'src/entities/department.entity';
import { WorkItemModule } from '../work-item/work-item.module';
import { MaterialSupplyBallotController } from './material-supply-ballot.controller';
import { MaterialSupplyBallotService } from './material-supply-ballot.service';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { HistoryRepairModule } from '../history-repair/history-repair.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MaterialSupplyBallot,
      TechnicalAppraisalBallot,
      DetailAppraisalBallot,
      DetailAppraisalBallotItem,
      PositionPermission,
      User,
      Position,
      AssignmentBallot,
      AssignmentBallotApproval,
      Equipment,
      Department,
      RepairRequest,
      AcceptanceRepairBallot,
      MaterialSupplyBallotDetail,
      WorkItem,
    ]),
    forwardRef(() => WorkItemModule),
    HistoryRepairModule,
  ],
  controllers: [MaterialSupplyBallotController],
  providers: [MaterialSupplyBallotService],
})
export class MaterialSupplyBallotModule {}
