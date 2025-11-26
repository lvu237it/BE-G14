import { Entity, Column, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base';
import { Position } from './position.entity';

@Entity({ name: 'permissions' })

export class Permission {
   @PrimaryGeneratedColumn('uuid')
    id: string;
    
  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToMany(() => Position, (position) => position.permissions)
  positions: Position[];
}
