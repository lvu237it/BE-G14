import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { VietnamTimezoneInterceptor } from './common/interceptors/vietnam-timezone.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { EquipmentTypeModule } from './modules/equipment-type/equipment-type.module';
import { MaterialModule } from './modules/material/material.module';
import { DepartmentModule } from './modules/department/department.module';
import { PositionModule } from './modules/position/position.module';
import { PermissionModule } from './modules/permission/permission.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { LocationEquipmentModule } from './modules/location-equipment/location-equipment.module';
import { SeedModule } from './modules/seed/seed.module';
import { MaterialTypeModule } from './modules/material-type/material-type.module';
import { MaterialSupplyBallotModule } from './modules/material-supply-ballot/material-supply-ballot.module';
import { HistoryEquipmentModule } from './modules/history-equipment/history-equipment.module';
import { AssignmentBallotModule } from './modules/assignment-ballot/assignment-ballot.module';
import { TechnicalAppraisalBallotModule } from './modules/technical-appraisal-ballot/technical-appraisal-ballot.module';
import { DetailAppraisalBallotModule } from './modules/detail-appraisal-ballot/detail-appraisal-ballot.module';
import { WorkItemModule } from './modules/work-item/work-item.module';
import { RepairRequestModule } from './modules/repair-request/repair-request.module';
import { QualityAssessmentBallotModule } from './modules/quality-assesment-ballot/quality-assesment-ballot.module';
import { AcceptanceRepairBallotModule } from './modules/acceptance-repair-ballot/acceptance-repair-ballot.module';
import { SettlementRepairBallot } from './entities/settlement-repair-ballot.entity';
import { SettlementRepairBallotModule } from './modules/settlement-repair-ballot/settlement-repair-ballot.module';
import { HistoryRepairModule } from './modules/history-repair/history-repair.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      ...databaseConfig,
    }),
    AuthModule,
    SeedModule,
    UserModule,
    EquipmentTypeModule,
    MaterialModule,
    DepartmentModule,
    LocationEquipmentModule,
    PositionModule,
    PermissionModule,
    EquipmentModule,
    MaterialTypeModule,
    MaterialSupplyBallotModule,
    HistoryEquipmentModule,
    AssignmentBallotModule,
    TechnicalAppraisalBallotModule,
    DetailAppraisalBallotModule,
    WorkItemModule,
    RepairRequestModule,
    HistoryRepairModule,
    QualityAssessmentBallotModule,
    AcceptanceRepairBallotModule,
    SettlementRepairBallotModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: VietnamTimezoneInterceptor,
    },
  ],
})
export class AppModule {}
