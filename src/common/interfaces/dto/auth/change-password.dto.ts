import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'Admin@123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: 'Mật khẩu mới', example: 'NewPass@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
