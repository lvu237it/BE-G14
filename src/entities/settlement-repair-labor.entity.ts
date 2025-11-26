import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base';
import { SettlementRepairBallot } from './settlement-repair-ballot.entity';

@Entity({ name: 'settlement-repair-labor' })
export class SettlementRepairLabor extends BaseEntity {

  @ManyToOne(() => SettlementRepairBallot, (ballot) => ballot.items_labor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_repair_ballot_id' })
  settlementRepairBallot: SettlementRepairBallot;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', nullable: false })
  job_name: string;

  @Column({ type: 'varchar', nullable: false })
  worker_type: string;

  @Column({ type: 'int', nullable: false })
  work_days: number;

  @Column({ type: 'varchar', nullable: false })
  skill_level: string;
  
  @Column({ type: 'int', nullable: false })
  unit_price: number;

  @Column({ type: 'int', nullable: false })
  total: number;

  @Column({ type: 'varchar', nullable: false })
  notes: string;

}
