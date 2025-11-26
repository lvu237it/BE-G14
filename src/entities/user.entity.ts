import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base';
import { RoleSystem } from './role-system.entity';
import { Position } from './position.entity';
import { Department } from './department.entity';

@Entity({ name: 'user' })
export class User extends BaseEntity {
  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string;

  @Column({ type: 'varchar', nullable: false })
  password: string;

  @Column({ type: 'varchar', nullable: true })
  lastname: string;

  @Column({ type: 'varchar', nullable: true })
  firstname: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  card_number: string;

  @Column({ type: 'uuid', nullable: true })
  department_id: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  position_id: string;

  @Column({ type: 'uuid', nullable: true })
  role_system_id: string;

  @ManyToOne(() => RoleSystem, { nullable: true })
  @JoinColumn({ name: 'role_system_id' })
  roleSystem?: RoleSystem;

  @ManyToOne(() => Position, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position?: Position;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'deleted'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'deleted';

  @Column({ type: 'boolean', default: false })
  isNeedChangePassword: boolean;
}
