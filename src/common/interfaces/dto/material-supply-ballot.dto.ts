import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class EquipmentInfoDto {
  @ApiProperty({ example: 'EQP001', description: 'Mã thiết bị' })
  code: string;

  @ApiProperty({ example: 'Máy nén khí', description: 'Tên thiết bị' })
  name: string;
}

export class SortOptionDto {
  @ApiProperty({ enum: ['name', 'code', 'repair_count'] })
  @IsIn(['name', 'code', 'repair_count'])
  field: 'name' | 'code' | 'repair_count';

  @ApiProperty({ enum: ['ASC', 'DESC'] })
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC';
}

export class ReportQueryDto {
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

  @ApiProperty({ required: false, type: [SortOptionDto] })
  @IsOptional()
  sort?: SortOptionDto[];
}

export class MaterialSupplyBallotListItemDto {
  id: string;
  name: string;
  equipment_id?: string | null;
  @ApiPropertyOptional({ type: EquipmentInfoDto })
  equipment?: EquipmentInfoDto | null;
  level_repair?: string | null;
  lead_warehouse_id: string | null;
  receiver_id: string | null;
  transport_mechanic_id: string | null;
  deputy_foreman_id: string | null;
  status: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done';
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  @ApiPropertyOptional({
    description: 'Danh sách user được giao work item của phiếu này',
    type: [String],
  })
  assignedUserIds?: string[];
}

export class CreateMaterialSupplyBallotDto {
  @ApiProperty({
    description: 'Tên phiếu',
    example: 'Phiếu xin cấp vật tư cho máy X',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên phiếu không được để trống' })
  name: string;

  @ApiPropertyOptional({ description: 'ID thiết bị', example: 'uuid' })
  @IsNotEmpty({ message: 'Vui lòng chọn thiết bị' })
  @IsUUID()
  equipment_id: string;

  @ApiPropertyOptional({
    description: 'Cấp sửa chữa',
    enum: ['Sửa chữa', 'Bảo dưỡng', 'Xưởng sửa chữa', 'Xưởng bảo dưỡng'],
  })
  @IsNotEmpty({ message: 'Vui lòng chọn cấp sửa chữa' })
  @IsEnum(['Sửa chữa', 'Bảo dưỡng', 'Xưởng sửa chữa', 'Xưởng bảo dưỡng'])
  level_repair?:
    | 'Sửa chữa'
    | 'Bảo dưỡng'
    | 'Xưởng sửa chữa'
    | 'Xưởng bảo dưỡng';

  @ApiPropertyOptional({
    description: 'Trạng thái',
    enum: ['draft', 'pending', 'in_progress', 'rejected', 'done'],
  })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'in_progress', 'rejected', 'done'])
  status?: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done';

  @ApiPropertyOptional({ description: 'Tình trạng kỹ thuật' })
  @IsOptional()
  @IsString()
  technical_status?: string;

  @ApiPropertyOptional({ description: 'Nguyên nhân' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Biện pháp xử lý' })
  @IsOptional()
  @IsString()
  solution?: string;

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      'ID Phó quản đốc (người sẽ ký vào equipment_manager_id ở phiếu 01, 02, 04)',
    example: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  equipment_manager_id?: string;
}

export class CreateMaterialSupplyBallotDetailDto {
  @ApiPropertyOptional({ description: 'ID vật tư', example: 'uuid' })
  @IsUUID()
  @IsNotEmpty({ message: 'Vui lòng chọn vật tư' })
  material_id!: string;

  @ApiPropertyOptional({ description: 'Số lượng yêu cầu', example: 10 })
  @IsOptional()
  quantity_request?: number;

  @ApiPropertyOptional({ description: 'Số lượng đề xuất', example: 10 })
  @IsOptional()
  quantity_approve?: number;

  @ApiPropertyOptional({ description: 'Số lượng thực cấp', example: 8 })
  @IsOptional()
  quantity_supplies?: number;

  @ApiPropertyOptional({
    description: 'Lý do',
    enum: ['Thay mới', 'Sửa chữa', 'Dùng lại'],
  })
  @IsOptional()
  @IsEnum(['Thay mới', 'Sửa chữa', 'Dùng lại'])
  reason?: 'Thay mới' | 'Sửa chữa' | 'Dùng lại';

  @ApiPropertyOptional({ description: 'Ghi chú', example: 'Note...' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateMaterialSupplyBallotWithDetailsDto extends CreateMaterialSupplyBallotDto {
  @ApiPropertyOptional({ type: [CreateMaterialSupplyBallotDetailDto] })
  @IsOptional()
  @Type(() => CreateMaterialSupplyBallotDetailDto)
  details?: CreateMaterialSupplyBallotDetailDto[];
}

export class ApproveMaterialSupplyBallotDetailDto {
  @ApiPropertyOptional({ description: 'ID vật tư', example: 'uuid' })
  @IsUUID()
  material_id: string;

  @ApiPropertyOptional({ description: 'Số lượng yêu cầu', example: 3 })
  @IsOptional()
  @IsNumber()
  quantity_request?: number;

  @ApiPropertyOptional({
    description: 'Số lượng duyệt (phê duyệt)',
    example: 2,
  })
  @IsOptional()
  @IsNumber()
  quantity_approve?: number;

  @ApiPropertyOptional({ description: 'Số lượng thực cấp', example: 2 })
  @IsOptional()
  @IsNumber()
  quantity_supplies?: number;

  @ApiPropertyOptional({ description: 'Lý do', example: 'Hư hỏng' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Ghi chú (tùy chọn)',
    example: 'Cần kiểm tra',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveMaterialSupplyBallotDto {
  @ApiPropertyOptional({
    description: 'Cấp sửa chữa',
    enum: ['Sửa chữa', 'Bảo dưỡng', 'Xưởng sửa chữa', 'Xưởng bảo dưỡng'],
  })
  @IsOptional()
  @IsEnum(['Sửa chữa', 'Bảo dưỡng', 'Xưởng sửa chữa', 'Xưởng bảo dưỡng'])
  level_repair?:
    | 'Sửa chữa'
    | 'Bảo dưỡng'
    | 'Xưởng sửa chữa'
    | 'Xưởng bảo dưỡng';

  @ApiPropertyOptional({ type: [ApproveMaterialSupplyBallotDetailDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ApproveMaterialSupplyBallotDetailDto)
  details?: ApproveMaterialSupplyBallotDetailDto[];
}

export class SignAndAdjustSuppliesDetailDto {
  @ApiPropertyOptional({ description: 'ID vật tư', example: 'uuid' })
  @IsUUID()
  material_id: string;

  @ApiPropertyOptional({
    description: 'Số lượng thực cấp (Thủ kho điều chỉnh)',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  quantity_supplies?: number;
}

export class SignAndAdjustSuppliesDto {
  @ApiPropertyOptional({ type: [SignAndAdjustSuppliesDetailDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SignAndAdjustSuppliesDetailDto)
  details?: SignAndAdjustSuppliesDetailDto[];
}

export class HistoryRepairSortOptionDto {
  @ApiPropertyOptional({
    enum: ['equipment_name', 'equipment_code', 'start_date', 'end_date'],
  })
  @IsEnum(['equipment_name', 'equipment_code', 'start_date', 'end_date'])
  @IsOptional()
  field?: 'equipment_name' | 'equipment_code' | 'start_date' | 'end_date';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsEnum(['ASC', 'DESC'])
  @IsOptional()
  order?: 'ASC' | 'DESC';
}

export class HistoryRepairQueryDto {
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

  @ApiPropertyOptional({ enum: ['pending', 'done'] })
  @IsOptional()
  @IsEnum(['pending', 'done'])
  status?: 'pending' | 'done';

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Sort JSON array',
    example: `[{"field":"equipment_name","order":"ASC"}]`,
  })
  @IsOptional()
  @IsString()
  sort?: string;
}
