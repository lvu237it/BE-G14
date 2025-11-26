import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkItem } from 'src/entities/work-item.entity';
import { User } from 'src/entities/user.entity';
import { Position } from 'src/entities/position.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { WorkItemController } from './work-item.controller';
import { WorkItemService } from './work-item.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkItem, User, Position, PositionPermission]),
  ],
  controllers: [WorkItemController],
  providers: [WorkItemService],
  exports: [WorkItemService],
})
export class WorkItemModule {}
