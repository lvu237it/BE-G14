import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { User } from 'src/entities/user.entity';
import { TechnicalAppraisalBallotController } from './technical-appraisal-ballot.controller';
import { TechnicalAppraisalBallotService } from './technical-appraisal-ballot.service';
import { WorkItemModule } from '../work-item/work-item.module';
import { HistoryRepairModule } from '../history-repair/history-repair.module';
import { Department } from 'src/entities/department.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TechnicalAppraisalBallot,
      PositionPermission,
      User,
      Department,
      MaterialSupplyBallot,
    ]),
    forwardRef(() => WorkItemModule),
    HistoryRepairModule,
  ],
  controllers: [TechnicalAppraisalBallotController],
  providers: [TechnicalAppraisalBallotService],
})
export class TechnicalAppraisalBallotModule {}
