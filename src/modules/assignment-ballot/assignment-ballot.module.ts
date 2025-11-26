import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { AssignmentBallotController } from './assignment-ballot.controller';
import { AssignmentBallotService } from './assignment-ballot.service';
import {
  DetailAppraisalBallot,
  MaterialSupplyBallot,
  TechnicalAppraisalBallot,
  WorkItem,
  AssignmentBallotApproval,
  User,
  Position,
  PositionPermission,
} from 'src/entities';
import { WorkItemModule } from '../work-item/work-item.module';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { HistoryRepairModule } from '../history-repair/history-repair.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentBallot,
      MaterialSupplyBallot,
      TechnicalAppraisalBallot,
      DetailAppraisalBallot,
      WorkItem,
      AssignmentBallotApproval,
      User,
      Position,
      PositionPermission,
      AcceptanceRepairBallot,
    ]),
    forwardRef(() => WorkItemModule),
    HistoryRepairModule,
  ],
  controllers: [AssignmentBallotController],
  providers: [AssignmentBallotService],
})
export class AssignmentBallotModule {}
