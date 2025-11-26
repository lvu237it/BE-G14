import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { Equipment } from './equipment.entity';
import { MaterialSupplyBallot } from './material-supply-ballot.entity';
import { TechnicalAppraisalBallot } from './technical-appraisal-ballot.entity';
import { DetailAppraisalBallot } from './detail-appraisal-ballot.entity';
import { AssignmentBallot } from './assignment-ballot.entity';
import { AcceptanceRepairBallot } from './acceptance-repair-ballot.entity';
import { SettlementRepairBallot } from './settlement-repair-ballot.entity';
import { QualityAssessmentBallot } from './quality-assessment-ballot.entity';

@Entity({ name: 'repair_request' })
export class RepairRequest extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: false })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({ type: 'timestamp', nullable: false })
  start_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  end_date?: Date;

  @Column({
    type: 'enum',
    enum: ['pending', 'done'],
    default: 'pending',
  })
  status: 'pending' | 'done';

  @OneToMany(() => MaterialSupplyBallot, (b) => b.repairRequest)
  materialSupplyBallots: MaterialSupplyBallot[];

  @Column({ type: 'uuid', nullable: true })
  technical_appraisal_ballot_id: string;

  @ManyToOne(() => TechnicalAppraisalBallot, { nullable: true })
  @JoinColumn({ name: 'technical_appraisal_ballot_id' })
  technicalAppraisalBallot?: TechnicalAppraisalBallot;

  @Column({ type: 'uuid', nullable: true })
  detail_appraisal_ballot_id: string;

  @ManyToOne(() => DetailAppraisalBallot, { nullable: true })
  @JoinColumn({ name: 'detail_appraisal_ballot_id' })
  detailAppraisalBallot?: DetailAppraisalBallot;

  @Column({ type: 'uuid', nullable: true })
  assignment_ballot_id: string;

  @ManyToOne(() => AssignmentBallot, { nullable: true })
  @JoinColumn({ name: 'assignment_ballot_id' })
  assignmentBallot?: AssignmentBallot;

  @Column({ type: 'uuid', nullable: true })
  acceptance_repair_id: string;

  @ManyToOne(() => AcceptanceRepairBallot, { nullable: true })
  @JoinColumn({ name: 'acceptance_repair_id' })
  acceptanceRepairBallot?: AcceptanceRepairBallot;

  @Column({ type: 'uuid', nullable: true })
  settlement_repair_ballot_id: string;

  @ManyToOne(() => SettlementRepairBallot, { nullable: true })
  @JoinColumn({ name: 'settlement_repair_ballot_id' })
  settlementRepairBallot?: SettlementRepairBallot;

  @Column({ type: 'uuid', nullable: true })
  quality_assessment_ballot_id: string;

  @ManyToOne(() => QualityAssessmentBallot, { nullable: true })
  @JoinColumn({ name: 'quality_assessment_ballot_id' })
  qualityAssessmentBallot?: QualityAssessmentBallot;
}
