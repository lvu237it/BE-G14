import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { Position } from './position.entity';

@Entity('departments')
export class Department extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => Position, (position) => position.department)
  positions: Position[];

  @ManyToOne(() => Department, (department) => department.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: Department;

  @OneToMany(() => Department, (department) => department.parent)
  children?: Department[];

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

}
