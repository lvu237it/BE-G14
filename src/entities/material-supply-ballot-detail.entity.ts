import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { MaterialSupplyBallot } from './material-supply-ballot.entity';
import { Material } from './material.entity';

// Chi tiết dòng trong phiếu xin cấp vật tư
@Entity({ name: 'material_supply_ballot_detail' })
export class MaterialSupplyBallotDetail extends BaseEntity {
  @Column({ type: 'uuid' })
  material_supply_ballot_id: string;

  @ManyToOne(() => MaterialSupplyBallot, (b) => b.details, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'material_supply_ballot_id' })
  materialSupplyBallot: MaterialSupplyBallot;

  @Column({ type: 'uuid', nullable: true })
  material_id?: string;

  @ManyToOne(() => Material, { nullable: true })
  @JoinColumn({ name: 'material_id' })
  material?: Material;

  @Column({ type: 'int', nullable: true })
  quantity_request?: number;

  @Column({ type: 'int', nullable: true })
  quantity_approve?: number;

  @Column({ type: 'int', nullable: true })
  quantity_supplies?: number;

  @Column({
    type: 'enum',
    enum: ['Thay mới', 'Sửa chữa', 'Dùng lại'],
    nullable: true,
  })
  reason?: 'Thay mới' | 'Sửa chữa' | 'Dùng lại';

  @Column({ type: 'varchar', nullable: true })
  notes?: string;
}
