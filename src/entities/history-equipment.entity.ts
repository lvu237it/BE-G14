import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { Department } from './department.entity';
import { EquipmentType } from './equipment-type.entity';
import { LocationEquipment } from './location-equipment.entity';

@Entity({ name: 'history_equiment' })
export class HistoryEquipment extends BaseEntity {
  @Column({ type: 'uuid',nullable: true})
  equipment_id: string;

  @Column({ type: 'varchar', nullable: false })
  code: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  unit: string;

  @Column({ type: 'uuid', nullable: true })
  location_id: string;

  @ManyToOne(() => LocationEquipment, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location?: LocationEquipment;

  @Column({ type: 'uuid', nullable: true })
  department_id: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  equipment_type_id: string;

  @ManyToOne(() => EquipmentType, { nullable: true })
  @JoinColumn({ name: 'equipment_type_id' })
  equipmentType?: EquipmentType;

  @Column({ type: 'varchar', nullable: false })
  inventory_number: string;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'maintenance', 'broken'],
    default: 'active',
  })
  status: 'active' | 'inactive' | 'maintenance' | 'broken';
}
