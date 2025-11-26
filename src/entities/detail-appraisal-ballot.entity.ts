import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';
import { DetailAppraisalBallotItem } from './detail-appraisal-ballot-item.entity';

// Phiếu giám định kĩ thuật chi tiết Mẫu số 02/SCTX

@Entity({ name: 'detail_appraisal_ballot' })
export class DetailAppraisalBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'done'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'done';

  @Column({ type: 'varchar', nullable: true })
  technical_status?: string;
  @Column({ type: 'varchar', nullable: true })
  reason?: string;
  @Column({ type: 'varchar', nullable: true })
  solution?: string;

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

  @OneToMany(() => DetailAppraisalBallotItem, (i) => i.ballot, {
    cascade: true,
  })
  items?: DetailAppraisalBallotItem[];
}
