import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base';

@Entity({ name: 'location_equipment' })
export class LocationEquipment extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;
}
