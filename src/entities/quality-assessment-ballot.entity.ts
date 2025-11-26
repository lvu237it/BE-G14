import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { QualityAssessmentItem } from './quality-assessment-item.entity';
import { Equipment } from './equipment.entity';
import { User } from './user.entity';

@Entity({ name: 'quality_assessment_ballot' })
export class QualityAssessmentBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;
  
  @ManyToOne(() => Equipment, { nullable: true,onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ type: 'varchar', nullable: true })
  request_no: string;

  @Column({ type: 'varchar', nullable: true })
  notes: string;

  @Column({ type: 'numeric', nullable: true })
  number_scrap: number;

  @Column({ type: 'numeric', nullable: true })
  number_refund: number;

  @Column({ type: 'uuid', nullable: true })
  deputy_director_id: string;

  @ManyToOne(() => User, { nullable: true ,onDelete: 'SET NULL'})
  @JoinColumn({ name: 'deputy_director_id' })
  deputyDirector?: User;

  @Column({ type: 'uuid', nullable: true, })
  lead_finance_accounting_id: string;

  @ManyToOne(() => User, { nullable: true,onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_finance_accounting_id' })
  financeUser?: User;

  @Column({ type: 'uuid', nullable: true })
  lead_first_plan: string;

  @ManyToOne(() => User, { nullable: true,onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_first_plan' })
  planUser?: User;

  @Column({ type: 'uuid', nullable: true })
  lead_transport_mechanic: string;

  @ManyToOne(() => User, { nullable: true,onDelete: 'SET NULL' })
  @JoinColumn({ name: 'lead_transport_mechanic' })
  transportUser?:User;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved','in_progress', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'in_progress' | 'rejected';

  @Column({
    type: 'enum',
    enum: ['','created', 'updated'],
    default: '',
    nullable:true
  },)
  statusButton: ''| 'created' | 'updated';

  @OneToMany(() => QualityAssessmentItem, (item) => item.qualityAssessmentBallot, {
    cascade: true,
  })
  items: QualityAssessmentItem[];

  @Column({ type: 'jsonb', nullable: true, default: [] })
sign_ids: string[];
}
