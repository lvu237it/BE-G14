import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Số điện thoại', example: '0984235573' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Mật khẩu', example: '12345678A' })
  @IsString()
  password: string;
}
