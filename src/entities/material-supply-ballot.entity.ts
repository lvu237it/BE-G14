import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { DetailAppraisalBallot } from './detail-appraisal-ballot.entity';
import { Equipment } from './equipment.entity';
import { MaterialSupplyBallotDetail } from './material-supply-ballot-detail.entity';
import { RepairRequest } from './repair-request.entity';
import { TechnicalAppraisalBallot } from './technical-appraisal-ballot.entity';
import { User } from './user.entity';

// Phiếu xin cấp vật tư
@Entity({ name: 'material_supply_ballot' })
export class MaterialSupplyBallot extends BaseEntity {
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
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({
    type: 'enum',
    enum: ['Sửa chữa', 'Bảo dưỡng', 'Xưởng sửa chữa', 'Xưởng bảo dưỡng'],
    nullable: true,
  })
  level_repair?:
    | 'Sửa chữa'
    | 'Bảo dưỡng'
    | 'Xưởng sửa chữa'
    | 'Xưởng bảo dưỡng';

  @Column({ type: 'varchar', nullable: true })
  technical_status?: string;

  @Column({ type: 'varchar', nullable: true })
  reason?: string;

  @Column({ type: 'varchar', nullable: true })
  solution?: string;

  @Column({ type: 'uuid', nullable: true })
  lead_warehouse_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'lead_warehouse_id' })
  leadWarehouse?: User;

  @Column({ type: 'uuid', nullable: true })
  receiver_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'receiver_id' })
  receiver?: User;

  @Column({ type: 'uuid', nullable: true })
  transport_mechanic_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transport_mechanic_id' })
  transportMechanic?: User;

  @Column({ type: 'uuid', nullable: true })
  deputy_foreman_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'deputy_foreman_id' })
  deputyForeman?: User;

  @Column({ type: 'uuid', nullable: true })
  equipment_manager_id?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'equipment_manager_id' })
  equipmentManager?: User;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'in_progress', 'rejected', 'done'],
    default: 'pending',
  })
  status: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done';

  // Danh sách dòng vật tư của phiếu
  @OneToMany(() => MaterialSupplyBallotDetail, (i) => i.materialSupplyBallot, {
    cascade: true,
  })
  details?: MaterialSupplyBallotDetail[];

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @Column({ type: 'uuid', nullable: true })
  repair_request_id?: string;

  @ManyToOne(() => RepairRequest, (repair) => repair.materialSupplyBallots, {
    nullable: true,
  })
  @JoinColumn({ name: 'repair_request_id' })
  repairRequest?: RepairRequest;

  @Column({ type: 'boolean', default: false })
  is_merged: boolean = false;
}
