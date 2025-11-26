import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { AssignmentBallot } from './assignment-ballot.entity';
import { User } from './user.entity';

@Entity({ name: 'assignment_ballot_approval' })
export class AssignmentBallotApproval extends BaseEntity {
  @Column({ type: 'uuid', nullable: false })
  assignment_ballot_id: string;

  @ManyToOne(() => AssignmentBallot, { nullable: false })
  @JoinColumn({ name: 'assignment_ballot_id' })
  assignmentBallot?: AssignmentBallot;

  @Column({ type: 'uuid', nullable: true })
  approver_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: User;

  @Column({ type: 'uuid', nullable: true })
  approver_lead_id: string;

  @ManyToOne(() => User, { nullable: true})
  @JoinColumn({ name: 'approver_lead_id' })
  approverLead?: User;

  @Column({ type: 'uuid', nullable: true })
  approver_final_id: string;

  @ManyToOne(() => User, { nullable: true})
  @JoinColumn({ name: 'approver_final_id' })
  approverFinal?: User;

  @Column({ type: 'varchar', length: 255 })
  position_name: string; // Chức danh: Quản đốc, PQĐ...

  @Column({
    type: 'enum',
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  })
  status: 'Pending' | 'Approved' | 'Rejected';

  @Column({ type: 'uuid', nullable: true })
  delegated_to?: string; // User được ủy quyền

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_to' })
  delegatedUser?: User;

  @Column({ type: 'uuid', nullable: true })
  delegated_lead_to?: string; // User được ủy quyền

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'delegated_lead_to' })
  delegatedLeadUser?: User;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;
}
