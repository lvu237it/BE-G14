import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { Department } from './department.entity';
import { PositionPermission } from './position-permission.entity';

@Entity({ name: 'positions' })
export class Position extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  code: string;

  @ManyToOne(() => Department, (department) => department.positions, {
    onDelete: 'CASCADE',
  })
  department: Department;

  @OneToMany(() => PositionPermission, (pp) => pp.position, { cascade: true })
  permissions: PositionPermission[];
}
