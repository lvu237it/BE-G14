import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base';
import { QualityAssessmentBallot } from './quality-assessment-ballot.entity';
import { Material } from './material.entity';

@Entity({ name: 'quality_assessment_item' })
export class QualityAssessmentItem extends BaseEntity {
  @ManyToOne(() => QualityAssessmentBallot, (ballot) => ballot.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quality_assessment_ballot_id' })
  qualityAssessmentBallot: QualityAssessmentBallot;

  @Column({ type: 'uuid' })
  quality_assessment_ballot_id: string;

  @Column({ type: 'uuid' })
  material_id: string;

  @ManyToOne(() => Material, { nullable: true,onDelete: 'SET NULL' })
    @JoinColumn({ name: 'material_id' })
    material?:Material;

  @Column({ type: 'varchar', nullable: true })
  unit: string;

  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'enum', enum: ['hỏng', 'sữa chữa','thay mới'], default: 'hỏng' })
  technical_status: 'hỏng' | 'sữa chữa' | 'thay mới';

  @Column({ type: 'varchar', nullable: true })
  treatment_measure: string;

  @Column({ type: 'varchar', nullable: true })
  notes: string;
}
