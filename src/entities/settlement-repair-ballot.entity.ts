import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { SettlementRepairMaterial } from './settlement-repair-material.entity';
import { SettlementRepairLabor } from './settlement-repair-labor.entity';
import { User } from './user.entity';
import { Equipment } from './equipment.entity';
import { Department } from './department.entity';

@Entity({ name: 'settlement-repair-ballot' })
export class SettlementRepairBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;


  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;
  

   @Column({ type: 'uuid', nullable: true })
  creator_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creatorUser?: User;

  @Column({ type: 'uuid', nullable: true })
  site_manager_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'site_manager_id' })
  siteManagerUser?: User;

   @Column({ type: 'uuid', nullable: true })
  head_settlement_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'head_settlement_id' })
  headSettlementUser?: User;

   @Column({ type: 'uuid', nullable: true })
  planner_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'planner_id' })
  planUser?: User;

   @Column({ type: 'uuid', nullable: true })
  finance_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'finance_id' })
  financeUser?: User;

   @Column({ type: 'uuid', nullable: true })
  transport_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'transport_id' })
  transportUser?: User;

   @Column({ type: 'uuid', nullable: true })
  organize_id: string;
  
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'organize_id' })
  organizeUser?: User;

  @Column({
    type: 'enum',
    enum: ['','pending', 'approved'],
    default: '',
    nullable:true
  })
  status: '' | 'pending' | 'approved';

  @OneToMany(() => SettlementRepairMaterial, (item) => item.settlementRepairBallot, {
      cascade: true,
    })
    items_material: SettlementRepairMaterial[];

  @OneToMany(() => SettlementRepairLabor, (item) => item.settlementRepairBallot, {
      cascade: true,
    })
    items_labor: SettlementRepairLabor[];
  
  @Column({ type: 'int', nullable: true })
  totalLabor: number;

  @Column({ type: 'int', nullable: true })
  totalMaterial: number;
}
