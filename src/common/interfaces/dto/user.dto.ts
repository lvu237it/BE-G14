import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UserListItemDto {
  id: string;
  code: string;
  lastname: string;
  firstname: string;
  phone: string;
  password: string;
  card_number: string;
  department_id: string;
  position_id: string;
  role_system_id: string;
  roleSystem: string | null;
  status: 'active' | 'inactive' | 'deleted';
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class CreateUserDto {
  @ApiProperty({
    example: 'SONNT',
    description: 'Mã định danh người dùng (duy nhất)',
  })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Son', description: 'Họ người dùng' })
  @IsString()
  lastname: string;

  @ApiProperty({ example: 'Nguyen Thai', description: 'Tên người dùng' })
  @IsString()
  firstname: string;

  @ApiProperty({
    example: '0852824786',
    description: 'Số điện thoại người dùng (duy nhất)',
  })
  @IsString()
  phone: string;

  @ApiProperty({
    example: 'sonnguyen03',
    description: 'Mật khẩu (sẽ được hash khi lưu)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '123456', description: 'Số thẻ nhân viên' })
  @IsString()
  card_number: string;

  @ApiProperty({
    example: '7335bb40-f22f-4682-bcc8-5d1a4740085f',
    description: 'ID của vai trò hệ thống (bắt buộc)',
  })
  @IsUUID()
  role_system_id: string;

  @ApiPropertyOptional({
    example: null,
    description: 'ID phòng ban (có thể null)',
  })
  @IsUUID()
  @IsOptional()
  department_id?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'ID chức vụ (có thể null)',
  })
  @IsUUID()
  @IsOptional()
  position_id?: string | null;

  @ApiPropertyOptional({
    example: 'active',
    description: 'Trạng thái người dùng (active, inactive)',
    enum: ['active', 'inactive'],
  })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: 'active' | 'inactive';
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'SONNT', description: 'Mã code người dùng' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ example: 'Nguyen', description: 'Họ người dùng' })
  @IsString()
  @IsOptional()
  lastname?: string;

  @ApiPropertyOptional({ example: 'Thai Son', description: 'Tên người dùng' })
  @IsString()
  @IsOptional()
  firstname?: string;

  @ApiPropertyOptional({ example: '0852824786', description: 'Số điện thoại' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    example: 'NewPassword123',
    description: 'Mật khẩu mới',
  })
  @IsString()
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ example: '123456', description: 'Số thẻ nhân viên' })
  @IsString()
  @IsOptional()
  card_number?: string;

  @ApiPropertyOptional({
    example: '7335bb40-f22f-4682-bcc8-5d1a4740085f',
    description: 'ID vai trò hệ thống (có thể cập nhật)',
  })
  @IsUUID()
  @IsOptional()
  role_system_id?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'ID phòng ban (có thể null hoặc bỏ qua)',
  })
  @IsUUID()
  @IsOptional()
  department_id?: string | null;

  @ApiPropertyOptional({
    example: null,
    description: 'ID chức vụ (có thể null hoặc bỏ qua)',
  })
  @IsUUID()
  @IsOptional()
  position_id?: string | null;
}
