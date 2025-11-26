import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class LocationEquipmentDto {
  id: string;
  name: string;
  code?: string;
  description?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export class CreateLocationEquipmentDto {
  @ApiProperty({ example: 'Xưởng 7' })
  @IsString()
  @IsNotEmpty({ message: 'Tên vị trí không được để trống' })
  name: string;

  @ApiPropertyOptional({ example: 'CX7' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Khu vực để thiết bị vận tải' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateLocationEquipmentDto {
  @ApiPropertyOptional({ example: 'Xưởng 8' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CX8' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Khu vực để đồ máng cào.' })
  @IsString()
  @IsOptional()
  description?: string;
}
