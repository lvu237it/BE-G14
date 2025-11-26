import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt: Date;
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt: Date;
  @DeleteDateColumn({
    type: 'timestamp',
  })
  deletedAt: Date;
  @Column({ nullable: true, type: 'uuid' })
  createdBy: string;
  @Column({ nullable: true, type: 'uuid' })
  updatedBy: number;
  @Column({ nullable: true, type: 'uuid' })
  deletedBy: number;
}
