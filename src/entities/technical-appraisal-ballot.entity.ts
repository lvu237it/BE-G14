import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';

// Phiếu giám định kĩ thuật Mẫu số 01/SCTX
@Entity({ name: 'technical_appraisal_ballot' })
export class TechnicalAppraisalBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ type: 'varchar', nullable: true })
  technical_status?: string;
  @Column({ type: 'varchar', nullable: true })
  reason?: string;
  @Column({ type: 'varchar', nullable: true })
  solution?: string;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', nullable: true })
  operator_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'operator_id' })
  operator?: User;

  @Column({ type: 'uuid', nullable: true })
  equipment_manager_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'equipment_manager_id' })
  equipmentManager?: User;

  @Column({ type: 'uuid', nullable: true })
  repairman_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'repairman_id' })
  repairman?: User;

  @Column({ type: 'uuid', nullable: true })
  transport_mechanic_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transport_mechanic_id' })
  transportMechanic?: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'done'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'done';
}
