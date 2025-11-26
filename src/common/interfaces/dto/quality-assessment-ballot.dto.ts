import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

export class QualityAssessmentItemDto {
  @ApiProperty({ description: 'ID vật tư', example: 'd305d789-2b55-4704-84a8-a5c2e5ee0920' })
  @IsUUID()
  @IsOptional()
  material_id: string;

  @ApiProperty({ description: 'Đơn vị tính', example: 'Cái' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Số lượng ', example: 3 })
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Tình trạng kỹ thuật', enum: ['hỏng', 'sữa chữa','thay mới'], example: 'hỏng' })
  @IsEnum(['hỏng', 'sữa chữa','thay mới'])
  @IsOptional()
  technical_status?: 'hỏng' | 'sữa chữa' | 'thay mới';

  @ApiProperty({ description: 'Biện pháp xử lý', example: 'Thay mới' })
  @IsString()
  @IsOptional()
  treatment_measure?: string;

  @ApiProperty({ description: 'Ghi chú', example: '' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class QualityAssessmentBallotUpdateItemsDto {
  @ApiProperty({ description: 'Danh sách vật tư đánh giá', type: [QualityAssessmentItemDto] })
  @IsOptional()
  items: QualityAssessmentItemDto[];
}

export class QualityAssessmentBallotListItemDto {
  id: string;
  name: string;
  equipment?: {
    id: string;
    name: string;
    code: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
  request_no: string | null;
  notes: string | null;
  deputyDirector?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
     position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
  financeUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
    position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
  planUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
    position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
  transportUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
    position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
    signUsers?: {
    id: string;
    name: string;
    department?: { id: string; name: string };
    position?: { id: string; name: string; code: string };
  }[];
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  statusButton:'' | 'created' | 'updated';
  items: QualityAssessmentItemDto[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class QualityAssessmentBallotCreateDto {
  @ApiProperty({ description: 'Tên phiếu', example: 'DGCL001' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'ID thiết bị', example: 'd305d789-2b55-4704-84a8-a5c2e5ee0920' })
  @IsUUID()
  @IsOptional()
  equipment_id?: string;

  @ApiProperty({ description: 'Số đăng ký', example: 'YCNV001' })
  @IsString()
  @IsOptional()
  request_no?: string;

  @ApiProperty({ description: 'Ghi chú', example: '' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Phó giám đốc', example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  deputy_director_id?: string;

  @ApiProperty({ description: 'Kế toán trưởng', example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  lead_finance_accounting_id?: string;

  @ApiProperty({ description: 'Kế hoạch đầu tư', example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  lead_first_plan?: string;

  @ApiProperty({ description: 'Cơ điện vận tải', example: '' })
  @IsUUID()
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  lead_transport_mechanic?: string;

  @ApiProperty({
    description: 'Trạng thái',
    enum: ['pending', 'approved', 'rejected'],
    example: 'pending',
    required: false,
  })
  @IsEnum(['pending','in_progress', 'approved', 'rejected'])
  @IsOptional()
  status?: 'pending' | 'in_progress' | 'approved' | 'rejected';
  @ApiProperty({ description: 'Danh sách vật tư đánh giá', type: [QualityAssessmentItemDto] })
  @IsOptional()
  items: QualityAssessmentItemDto[];
}

