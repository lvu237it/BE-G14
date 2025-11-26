import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { DetailAppraisalBallot } from './detail-appraisal-ballot.entity';
import { Material } from './material.entity';

// Dòng chi tiết cho Mẫu số 02/SCTX
@Entity({ name: 'detail_appraisal_ballot_item' })
export class DetailAppraisalBallotItem extends BaseEntity {
  @Column({ type: 'uuid' })
  detail_appraisal_ballot_id: string;

  @ManyToOne(() => DetailAppraisalBallot, (b) => b.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'detail_appraisal_ballot_id' })
  ballot: DetailAppraisalBallot;

  @Column({ type: 'uuid', nullable: true })
  material_id?: string;

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'material_id' })
  material?: Material;

  @Column({ type: 'int', nullable: true })
  quantity?: number;

  @Column({ type: 'varchar', nullable: true })
  technical_status?: string;

  @Column({
    type: 'enum',
    enum: ['Thay mới', 'Sửa chữa', 'Dùng lại'],
    nullable: true,
  })
  treatment_measure?: 'Thay mới' | 'Sửa chữa' | 'Dùng lại';

  @Column({ type: 'varchar', nullable: true })
  notes_technical?: string;

  @Column({ type: 'varchar', nullable: true })
  notes_suggest?: string;
}
