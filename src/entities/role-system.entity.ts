import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base';

@Entity({ name: 'role_system' })
export class RoleSystem extends BaseEntity {
  @Column({ type: 'varchar', nullable: false, unique: true })
  name: string;
}
