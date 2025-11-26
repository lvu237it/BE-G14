import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePositionDto {
  
  @ApiProperty({ example: 'Giám đốc', description: 'Tên chức danh (duy nhất)' })
  @IsString()
  @IsNotEmpty()
  name: string;
  
  @ApiProperty({ example: '238fee7b-0d41-4b7b-b3fa-d459ace66a0c', description: 'Tên phòng ban (duy nhất)' })
  @IsUUID()
  @IsNotEmpty()
  departmentId: string;

  @ApiProperty({ example: 'Warehouse', description: 'Code' })
  @IsNotEmpty()
  code: string;
  
  @ApiProperty({ example: 'Giám đốc chức to', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePositionDto {
  @ApiProperty({ example: 'Phó giám đốc', description: 'Tên chức danh (duy nhất)' })
  @IsOptional()
  @IsString()
  name?: string;
  
  @ApiProperty({ example: '238fee7b-0d41-4b7b-b3fa-d459ace66a0c', description: 'Tên phòng ban (duy nhất)' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;
  
  @ApiProperty({ example: 'Warehouse', description: 'Code' })
  @IsNotEmpty()
  code?: string;
  
  @ApiProperty({ example: 'Cập nhật chức danh', description: 'Mô tả' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class PositionListItemDto {
  id: string;
  name: string;
  description?: string;
  code:string;
  departmentName: string;
}

export class PositionItemDto {
  id: string;
  name: string;
  code:string;
  description?: string;
  departmentId: string;
}

export class AssignPermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'Danh sách UUID permission',
    example: ['fae72788-a87f-4d75-9055-dd2756ed4279'],
  })
  @IsArray()
  @IsUUID('all', { each: true })
  permissionIds: string[];
}
