import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base';

@Entity({ name: 'equipment_type' })
export class EquipmentType extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;
}
