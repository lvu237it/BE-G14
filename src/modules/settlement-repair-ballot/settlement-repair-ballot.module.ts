import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { SettlementRepairMaterial } from 'src/entities/settlement-repair-material.entity';
import { SettlementRepairLabor } from 'src/entities/settlement-repair-labor.entity';
import { SettlementRepairBallotService } from './settlement-repair-ballot.service';
import { SettlementRepairBallotController } from './settlement-repair-ballot.controller';
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
import { RepairRequest } from 'src/entities/repair-request.entity';
import { HistoryRepair } from 'src/entities/history-repair.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettlementRepairBallot,
      SettlementRepairMaterial,
      SettlementRepairLabor,
      User,
      PositionPermission,
      Position,
      Department,
      Equipment,
      MaterialSupplyBallot,
      RepairRequest,
      HistoryRepair,
    ]),
    WorkItemModule,
    HistoryRepairModule,
  ],
  providers: [SettlementRepairBallotService],
  controllers: [SettlementRepairBallotController],
  exports: [SettlementRepairBallotService],
})
export class SettlementRepairBallotModule {}
