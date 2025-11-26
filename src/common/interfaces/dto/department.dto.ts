import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
} from 'class-validator';

export class DepartmentListItemDto {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class DepartmentItemDto {
  id: string;
  name: string;
}

export class CreateDepartmentDto {
  @ApiProperty({ example: 'HR001', description: 'Mã phòng ban (duy nhất)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Phòng Nhân Sự', description: 'Tên phòng ban' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Tạo mới phòng ban', description: 'Mô tả' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 'uuid-cua-phong-ban-cha',
    description: 'ID của phòng ban cha (nếu có)',
  })
  @IsOptional()
  parent_id?: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái phòng ban',
    enum: ['active', 'inactive'],
  })
  @IsEnum(['active', 'inactive'])
  @IsNotEmpty()
  status: 'active' | 'inactive';
}

export class UpdateDepartmentDto {
  @ApiPropertyOptional({ example: 'HR002', description: 'Mã phòng ban' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Phòng IT', description: 'Tên phòng ban' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Cập nhật phòng ban', description: 'Mô tả' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    example: 'uuid-cua-phong-ban-cha',
    description: 'ID của phòng ban cha (nếu có)',
  })
  @IsOptional()
  parent_id?: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái phòng ban',
    enum: ['active', 'inactive'],
  })
  @IsEnum(['active', 'inactive'])
  @IsNotEmpty()
  status: 'active' | 'inactive';
}
