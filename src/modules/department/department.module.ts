import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from 'src/entities/department.entity';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { PositionPermission } from 'src/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Department,PositionPermission])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
