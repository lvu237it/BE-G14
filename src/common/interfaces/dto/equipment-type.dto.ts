import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class EquipmentTypeDto {
  id: string;
  name: string;
  description?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class CreateEquipmentTypeDto {
  @ApiProperty({ example: 'Máy cắt sắt' })
  @IsString()
  @IsNotEmpty({ message: 'Tên loại thiết bị không được để trống' })
  name: string;

  @ApiPropertyOptional({ example: 'Thiết bị cắt kim loại cỡ lớn.' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateEquipmentTypeDto {
  @ApiPropertyOptional({ example: 'Máy cắt thép' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Dùng để cắt sắt/thép khối lượng lớn.' })
  @IsString()
  @IsOptional()
  description?: string;
}
