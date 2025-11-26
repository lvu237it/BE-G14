import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  IsNumber,
  IsIn,
} from 'class-validator';

export class WorkItemSortOptionDto {
  @ApiProperty({ enum: ['start_date', 'task_name', 'ballot_name'] })
  @IsIn(['start_date', 'task_name', 'ballot_name'])
  field: 'start_date' | 'task_name' | 'ballot_name';

  @ApiProperty({ enum: ['ASC', 'DESC'] })
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC';
}

export class WorkItemQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false, example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ type: [WorkItemSortOptionDto] })
  @IsOptional()
  sort?: WorkItemSortOptionDto[];
}

export class WorkItemListItemDto {
  @ApiProperty({ description: 'ID công việc', example: 'uuid' })
  id: string;

  @ApiProperty({
    description: 'Tên biên bản & phiếu',
    example: 'PHIẾU XIN CẤP VẬT TƯ',
  })
  ballot_name: string;

  @ApiProperty({ description: 'Tên công việc', example: 'Ký xác nhận' })
  task_name: string;

  @ApiProperty({ description: 'Ngày bắt đầu', example: '2025-10-22' })
  start_date: Date | null;

  @ApiProperty({
    description: 'Trạng thái',
    enum: ['pending', 'completed'],
    example: 'pending',
  })
  status: 'pending' | 'completed';

  @ApiProperty({ description: 'Loại biên bản', example: 'MSB' })
  ref_type: string;

  @ApiProperty({ description: 'ID biên bản', example: 'uuid' })
  ref_id: string;

  @ApiProperty({
    description: 'Loại công việc',
    example: 'sign',
  })
  task_type: string;

  @ApiPropertyOptional({
    description: 'Thông tin người giao việc (người tạo work item)',
    example: {
      id: 'uuid',
      code: 'USER001',
      firstname: 'Nguyễn',
      lastname: 'Văn A',
    },
  })
  assigner?: {
    id: string;
    code: string;
    firstname: string;
    lastname: string;
  } | null;

  @ApiProperty({ description: 'Ngày tạo', example: '2025-10-22T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Ngày cập nhật',
    example: '2025-10-22T00:00:00Z',
  })
  updatedAt: Date;
}

export class CreateWorkItemDto {
  @ApiProperty({ description: 'ID user được giao việc', example: 'uuid' })
  @IsUUID()
  user_id: string;

  @ApiProperty({
    description: 'Loại biên bản',
    example: 'MSB',
    enum: ['MSB', 'TAB', 'DAB', 'ASB'],
  })
  @IsString()
  ref_type: string;

  @ApiProperty({ description: 'ID biên bản', example: 'uuid' })
  @IsUUID()
  ref_id: string;

  @ApiProperty({
    description: 'Loại công việc',
    example: 'sign',
  })
  @IsString()
  task_type: string;

  @ApiProperty({ description: 'Tên công việc', example: 'Ký xác nhận' })
  @IsString()
  task_name: string;

  @ApiProperty({ description: 'Tên biên bản', example: 'PHIẾU XIN CẤP VẬT TƯ' })
  @IsString()
  ballot_name: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu',
    example: '2025-10-22T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: Date;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    example: 'pending',
    enum: ['pending', 'completed'],
  })
  @IsOptional()
  @IsEnum(['pending', 'completed'])
  status?: 'pending' | 'completed';
}

export class UpdateWorkItemStatusDto {
  @ApiProperty({
    description: 'Trạng thái mới',
    enum: ['pending', 'completed'],
    example: 'completed',
  })
  @IsEnum(['pending', 'completed'])
  status: 'pending' | 'completed';

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;
}
