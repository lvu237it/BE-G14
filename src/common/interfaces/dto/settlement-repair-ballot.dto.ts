
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";

export class SettlementRepairMaterialDto {
  @ApiProperty({ description: 'ID vật tư', example: 'd305d789-2b55-4704-84a8-a5c2e5ee0920' })
  @IsUUID()
  @IsOptional()
  material_id?: string;

  @ApiProperty({ description: 'Tên vật tư', example: 'Motor' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Năm sản xuất', example: 2020 })
  @IsInt()
  @IsOptional()
  manufacture_year?: number;

  @ApiProperty({ description: 'Đơn vị', example: 'Cái' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Số lượng', example: 2 })
  @IsInt()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ description: 'Đơn giá', example: 100000 })
  @IsOptional()
  price?: number;

  @ApiProperty({ description: 'Tổng', example: 200000 })
  @IsOptional()
  total?: number;

  @ApiProperty({ description: 'Ghi chú', example: '' })
  @IsString()
  notes: string;
}

export class SettlementRepairLaborDto {
  @ApiProperty({ description: 'Tên nhân công', example: 'Nguyen Van A' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Công việc', example: 'Sửa động cơ' })
  @IsString()
  job_name: string;

  @ApiProperty({ description: 'Loại công nhân', example: 'Thợ chính' })
  @IsString()
  worker_type: string;

  @ApiProperty({ description: 'Số ngày công', example: 3 })
  @IsInt()
  work_days: number;

  @ApiProperty({ description: 'Trình độ', example: 'Cao' })
  @IsString()
  skill_level: string;

  @ApiProperty({ description: 'Đơn giá', example: 200000 })
  @IsInt()
  unit_price: number;

  @ApiProperty({ description: 'Tổng', example: 600000 })
  @IsInt()
  total: number;

  @ApiProperty({ description: 'Ghi chú', example: '' })
  @IsString()
  notes: string;
}


export class SettlementRepairBallotListItemDto {
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

  creatorUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  siteManagerUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
    position?: {
      id: string;
      name: string;
    } | null;
  } | null;

  headSettlementUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  planUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  financeUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  transportUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  organizeUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;

  status: '' | 'pending' | 'approved';
  totalMaterial : number;
  totalLabor: number;
  items_material: SettlementRepairMaterialDto[];
  items_labor: SettlementRepairLaborDto[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class SettlementRepairBallotUpdateItemsDto {
  @ApiProperty({ description: 'Danh sách vật tư', type: [SettlementRepairMaterialDto], required: false })
  @IsOptional()
  items_material?: SettlementRepairMaterialDto[];

  @ApiProperty({ description: 'Danh sách nhân công', type: [SettlementRepairLaborDto], required: false })
  @IsOptional()
  items_labor?: SettlementRepairLaborDto[];
}
