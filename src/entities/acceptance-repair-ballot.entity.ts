import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';

@Entity({ name: 'acceptance_repair_ballot' })
export class AcceptanceRepairBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ type: 'uuid', nullable: true })
  operator_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operator_id' })
  operatorUser?: User;

  @Column({ type: 'uuid', nullable: true })
  equipment_manager_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'equipment_manager_id' })
  equipmentManager?: User;

  @Column({ type: 'uuid', nullable: true })
  repairman_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'repairman_id' })
  repairmanUser?: User;

  @Column({ type: 'uuid', nullable: true })
  transport_mechanic_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transport_mechanic_id' })
  transportUser?: User;

  @Column({
    type: 'enum',
    enum: ['draft','pending', 'done'],
    default: 'draft',
    nullable: true
  })
  status: 'draft' | 'pending' | 'done';

@Column({ type: 'jsonb', nullable: true, default: [] })
sign_ids: string[];

@Column({ nullable: true, type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)', })
  fixDate: Date;

}
