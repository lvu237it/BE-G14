import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { User } from 'src/entities/user.entity';
import { DetailAppraisalBallotController } from './detail-appraisal-ballot.controller';
import { DetailAppraisalBallotService } from './detail-appraisal-ballot.service';
import { WorkItemModule } from '../work-item/work-item.module';
import { HistoryRepairModule } from '../history-repair/history-repair.module';
import { Department } from 'src/entities/department.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DetailAppraisalBallot,
      PositionPermission,
      User,
      Department,
      MaterialSupplyBallot,
    ]),
    forwardRef(() => WorkItemModule),
    HistoryRepairModule,
  ],
  controllers: [DetailAppraisalBallotController],
  providers: [DetailAppraisalBallotService],
})
export class DetailAppraisalBallotModule {}
