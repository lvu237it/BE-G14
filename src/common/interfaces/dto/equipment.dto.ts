import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class EquipmentListItemDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  location_id: string | null;
  department_id: string | null;
  equipment_type_id: string | null;
  inventory_number: string;
  status: 'active' | 'inactive' | 'maintenance' | 'broken';
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class EquipmentItemDto {
  id: string;
  code: string;
  name: string;
}

export class HistoryEquipmentListItemDto {
  id: string;
  equipment_id: string;
  code: string;
  name: string;
  unit: string;
  location_id: string | null;
  department_id: string | null;
  equipment_type_id: string | null;
  inventory_number: string;
  status: 'active' | 'inactive' | 'maintenance' | 'broken';
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class EquipmentWithHistoryDto {
  equipment: EquipmentListItemDto;
  history: HistoryEquipmentListItemDto;
}

export class CreateEquipmentDto {
  @ApiProperty({ description: 'Mã thiết bị', example: 'EQ-0001' })
  @IsString()
  @IsNotEmpty({ message: 'Mã thiết bị không được để trống' })
  code: string;

  @ApiProperty({ description: 'Tên thiết bị', example: 'Máy nén khí' })
  @IsString()
  @IsNotEmpty({ message: 'Tên thiết bị không được để trống' })
  name: string;

  @ApiPropertyOptional({ description: "Đơn vị tính (ví dụ: 'cái', 'bộ', ...)" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'ID vị trí đặt (UUID)',
    example: '2a0f0f9e-8cde-4b1a-8f55-7e4c1b2e3a10',
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban (UUID)',
    example: '5b9b2f2a-3fda-4b6d-9d1a-1a2b3c4d5e6f',
  })
  @IsOptional()
  @IsUUID()
  department_id?: string;

  @ApiPropertyOptional({
    description: 'ID loại thiết bị (UUID)',
    example: '1c2d3e4f-5a6b-7c8d-9e0f-112233445566',
  })
  @IsOptional()
  @IsUUID()
  equipment_type_id?: string;

  @ApiProperty({
    description: 'Số kiểm kê/thẻ (ký tự hoặc số, ví dụ: CK-123, 123456)',
    example: 'CK-123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số kiểm kê không được để trống' })
  inventory_number: string;

  @ApiProperty({
    description: 'Trạng thái',
    enum: ['active', 'inactive', 'maintenance', 'broken'],
    example: 'active',
  })
  @IsEnum(['active', 'inactive', 'maintenance', 'broken'])
  status: 'active' | 'inactive' | 'maintenance' | 'broken';
}

export class UpdateEquipmentDto {
  @ApiPropertyOptional({ description: 'Mã thiết bị', example: 'EQ-0001' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Tên thiết bị', example: 'Máy nén khí' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Đơn vị tính (ví dụ: 'cái', 'bộ', ...)" })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'ID vị trí đặt (UUID)',
    example: '2a0f0f9e-8cde-4b1a-8f55-7e4c1b2e3a10',
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({
    description: 'ID phòng ban (UUID)',
    example: '5b9b2f2a-3fda-4b6d-9d1a-1a2b3c4d5e6f',
  })
  @IsOptional()
  @IsUUID()
  department_id?: string;

  @ApiPropertyOptional({
    description: 'ID loại thiết bị (UUID)',
    example: '1c2d3e4f-5a6b-7c8d-9e0f-112233445566',
  })
  @IsOptional()
  @IsUUID()
  equipment_type_id?: string;

  @ApiProperty({
    description: 'Số kiểm kê/thẻ (ký tự hoặc số, ví dụ: CK-123, 123456)',
    example: 'CK-123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Số kiểm kê không được để trống' })
  inventory_number: string;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    enum: ['active', 'inactive', 'maintenance', 'broken'],
    example: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'maintenance', 'broken'])
  status?: 'active' | 'inactive' | 'maintenance' | 'broken';
}
