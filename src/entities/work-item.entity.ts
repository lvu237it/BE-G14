import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base';
import { User } from './user.entity';

// Công việc cần làm của user
@Entity({ name: 'work_item' })
export class WorkItem extends BaseEntity {
  // User được giao việc
  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // Loại biên bản/phiếu (MSB, TAB, DAB, ASB, ...)
  @Column({ type: 'varchar', length: 50, nullable: false })
  ref_type: string;

  // ID của biên bản/phiếu cụ thể
  @Column({ type: 'uuid', nullable: false })
  ref_id: string;

  // Loại công việc: 'sign' (Ký), 'approve' (Duyệt), 'adjust' (Điều chỉnh), 'review' (Xem lại), ...
  @Column({ type: 'varchar', length: 100, nullable: false })
  task_type: string;

  // Tên công việc hiển thị trên UI (VD: "Ký xác nhận", "Duyệt & điều chỉnh")
  @Column({ type: 'varchar', length: 255, nullable: false })
  task_name: string;

  // Tên biên bản/phiếu (để hiển thị, có thể lấy từ ref)
  @Column({ type: 'varchar', length: 500, nullable: false })
  ballot_name: string;

  // Trạng thái công việc
  @Column({
    type: 'enum',
    enum: ['pending', 'completed'],
    default: 'pending',
  })
  status: 'pending' | 'completed';

  // Ngày bắt đầu công việc (thường là ngày tạo ballot hoặc ngày chuyển trạng thái)
  @Column({ type: 'timestamp', nullable: true })
  start_date?: Date;

  // Ngày hoàn thành công việc
  @Column({ type: 'timestamp', nullable: true })
  completed_at?: Date;

  // Ghi chú (tùy chọn)
  @Column({ type: 'text', nullable: true })
  notes?: string;
}
