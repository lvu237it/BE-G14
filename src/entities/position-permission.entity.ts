import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Permission } from './permission.entity';
import { Position } from './position.entity';

@Entity({ name: 'position_permissions' })
export class PositionPermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Position, (position) => position.permissions, {
    onDelete: 'CASCADE',
  })
  position: Position;

  @ManyToOne(() => Permission, (permission) => permission.positions, {
    onDelete: 'CASCADE',
  })
  permission: Permission;
}
