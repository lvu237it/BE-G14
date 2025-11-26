import { Module } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { Position } from 'src/entities/position.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from 'src/entities/department.entity';
import { PermissionModule } from '../permission/permission.module';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { Permission } from 'src/entities/permission.entity';
import { RoleSystem } from 'src/entities/role-system.entity';
import { User } from 'src/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Position,Department,PositionPermission,Permission,User,RoleSystem]),PermissionModule],
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService],
})
export class PositionModule {}