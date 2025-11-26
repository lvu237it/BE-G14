import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { SettlementRepairBallot } from './settlement-repair-ballot.entity';
import { User } from './user.entity';
import { Material } from './material.entity';

@Entity({ name: 'settlement-repair-material' })
export class SettlementRepairMaterial extends BaseEntity {
  
  @ManyToOne(() => SettlementRepairBallot, (ballot) => ballot.items_material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_repair_ballot_id' })
  settlementRepairBallot: SettlementRepairBallot;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  material_id: string;

  @ManyToOne(() => Material, { nullable: true,onDelete: 'SET NULL' })
      @JoinColumn({ name: 'material_id' })
      material?:Material;

  @Column({ type: 'int', nullable: true })
  manufacture_year: number;

  @Column({ type: 'varchar', nullable: false })
  unit: string;
  
  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'float', nullable: true })
  price: number;

  @Column({ type: 'int', nullable: true })
  total: number;

  @Column({ type: 'varchar', nullable: false })
  notes: string;



}
