import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TechnicalAppraisalBallotViewDto {
  @ApiProperty({ description: 'ID biên bản' })
  id: string;

  @ApiProperty({ description: 'Tên biên bản' })
  name: string;

  @ApiPropertyOptional({ description: 'Thông tin thiết bị' })
  equipment?: {
    id: string;
    unit: string;
    code: string;
    name: string;
  } | null;

  @ApiPropertyOptional({ description: 'Tình trạng kỹ thuật' })
  technical_status?: string | null;

  @ApiPropertyOptional({ description: 'Nguyên nhân' })
  reason?: string | null;

  @ApiPropertyOptional({ description: 'Biện pháp xử lý' })
  solution?: string | null;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  notes?: string | null;

  @ApiPropertyOptional({ description: 'Thông tin người vận hành' })
  operator?: {
    id?: string;
    code: string;
    firstname: string;
    lastname: string;
    position: {
      code: string;
      name: string;
    };
    department: {
      code: string;
      name: string;
    };
  } | null;

  @ApiPropertyOptional({ description: 'Thông tin quản lý thiết bị' })
  equipment_manager?: {
    id?: string;
    code: string;
    firstname: string;
    lastname: string;
    position: {
      code: string;
      name: string;
    };
    department: {
      code: string;
      name: string;
    };
  } | null;

  @ApiPropertyOptional({ description: 'Thông tin thợ sửa chữa' })
  repairman?: {
    id?: string;
    code: string;
    firstname: string;
    lastname: string;
    position: {
      code: string;
      name: string;
    };
    department: {
      code: string;
      name: string;
    };
  } | null;

  @ApiPropertyOptional({ description: 'Thông tin thợ máy vận chuyển' })
  transport_mechanic?: {
    id?: string;
    code: string;
    firstname: string;
    lastname: string;
    position: {
      code: string;
      name: string;
    };
    department: {
      code: string;
      name: string;
    };
  } | null;

  @ApiProperty({
    description: 'Trạng thái',
    enum: ['pending', 'approved', 'rejected', 'done'],
  })
  status: 'pending' | 'approved' | 'rejected' | 'done';

  @ApiPropertyOptional({ description: 'Ngày tạo' })
  createdAt: Date | null;

  @ApiPropertyOptional({ description: 'Ngày cập nhật' })
  updatedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Danh sách userId được giao việc trên work item của phiếu này',
  })
  assignedUserIds?: string[];
}
