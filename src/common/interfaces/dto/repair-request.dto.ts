import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class RepairRequestListDto {
  @ApiProperty({ description: 'ID yêu cầu sửa chữa', example: 'uuid' })
  id?: string;

  @ApiProperty({
    description: 'Tên yêu cầu sửa chữa',
    example: 'Sửa chữa băng tải chính',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'ID thiết bị liên quan',
    example: 'uuid',
  })
  equipment_id?: string;

  @ApiPropertyOptional({
    description: 'Ngày bắt đầu sửa chữa',
    example: '2025-11-04T08:00:00Z',
  })
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'Ngày kết thúc dự kiến',
    example: '2025-11-07T17:00:00Z',
  })
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Trạng thái yêu cầu sửa chữa',
    enum: ['pending', 'done'],
    default: 'pending',
  })
  status?: 'pending' | 'done';

  @ApiPropertyOptional({
    description: 'Ghi chú',
    example: 'Ưu tiên xử lý trong tuần này',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Ngày tạo yêu cầu',
    example: '2025-11-04T09:15:00Z',
  })
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Ngày cập nhật cuối cùng',
    example: '2025-11-05T10:00:00Z',
  })
  updatedAt?: Date;
}
export class MaterialUsageSortOptionDto {
  @ApiPropertyOptional({ enum: ['name', 'code', 'quantity'] })
  @IsOptional()
  @IsIn(['name', 'code', 'quantity'])
  field?: 'name' | 'code' | 'quantity';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';
}
export class MaterialUsageQueryDto {
  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['thu-hoi', 'dung-lai', 'thay-moi'],
  })
  @IsOptional()
  @IsIn(['thu-hoi', 'dung-lai', 'thay-moi'])
  movement?: 'thu-hoi' | 'dung-lai' | 'thay-moi';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort options dạng JSON string',
    example: `[{"field":"name","order":"ASC"}]`,
  })
  @IsOptional()
  @IsString()
  sort?: string;
}

export class SortOptionRepairRequestDTO {
  @ApiProperty({ enum: ['start_date', 'equipment_name', 'equipment_code'] })
  @IsIn(['start_date', 'equipment_name', 'equipment_code'])
  field: 'start_date' | 'equipment_name' | 'equipment_code';

  @ApiProperty({ enum: ['ASC', 'DESC'] })
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC';
}

export class RepairRequestQueryDTO {
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

  @ApiPropertyOptional({
    type: [SortOptionRepairRequestDTO],
    description: 'Tùy chọn sắp xếp',
    example: [
      { field: 'start_date', order: 'DESC' },
      { field: 'equipment_name', order: 'ASC' },
    ],
  })
  @IsOptional()
  sort?: SortOptionRepairRequestDTO[];
}
