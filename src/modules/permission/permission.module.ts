import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from 'src/entities/permission.entity';
import { PermissionService } from './permission.service';
import { Position } from 'src/entities/position.entity';
import { User } from 'src/entities/user.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { PermissionController } from './permission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, Position, User, PositionPermission]),
  ],
  providers: [PermissionService],
  controllers: [PermissionController],
  exports: [PermissionService],
})
export class PermissionModule {}
