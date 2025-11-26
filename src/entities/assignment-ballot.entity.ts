import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base';
import { Equipment } from './equipment.entity';
import { Department } from './department.entity';
import { User } from './user.entity';
import { AssignmentBallotApproval } from './assignment-ballot-approval.entity';

@Entity({ name: 'assignment_ballot' })
export class AssignmentBallot extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  equipment_id: string;

  @ManyToOne(() => Equipment, { nullable: true })
  @JoinColumn({ name: 'equipment_id' })
  equipment?: Equipment;

  @Column({ type: 'uuid', nullable: true })
  assign_by: string;

  @ManyToOne(() => User, { nullable: true })
@JoinColumn({ name: 'assign_by' })
assignByUser?: User;


  @Column({ type: 'uuid', nullable: true })
  department_repair_id: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_repair_id' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  department_manager_id: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'department_manager_id' })
  departmentManager?: Department;

  @Column({
    type: 'enum',
    enum: ['pending', 'in_progress', 'done', 'rejected'],
    default: 'pending',
  })
  status: 'pending' | 'in_progress' | 'done' | 'rejected';

  @OneToOne(() => AssignmentBallotApproval, (approval) => approval.assignmentBallot)
  assignmentBallotApproval?: AssignmentBallotApproval;
}
