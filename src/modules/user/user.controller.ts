import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { RoleSystemName } from 'src/common/constants/roles_system';
import {
  CreateUserDto,
  UpdateUserDto,
  UserListItemDto,
} from 'src/common/interfaces/dto/user.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserService } from './user.service';

class UpdateStatusUserDto {
  @IsEnum(['active', 'inactive'])
  @IsNotEmpty()
  status: 'active' | 'inactive';
}

class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự.' })
  newPassword: string;
}

@ApiTags('Người dùng')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả người dùng (chỉ Admin, phân trang)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'position_id',
    required: false,
    type: String,
    example: 'uuid-position-id',
  })
  @ApiQuery({
    name: 'department_id',
    required: false,
    type: String,
    example: 'uuid-department-id',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    enum: ['firstname', 'lastname', 'createdAt'],
    example: 'lastname',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('position_id') position_id?: string,
    @Query('department_id') department_id?: string,
    @Query('sortBy') sortBy: 'firstname' | 'lastname' | 'createdAt' = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<ApiResponse<PaginatedResponse<UserListItemDto>>> {
    try {
      const data = await this.userService.findAll(
        Number(page),
        Number(limit),
        position_id,
        department_id,
        sortBy,
        sortOrder,
      );

      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xem chi tiết user (ADMIN)' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<UserListItemDto>> {
    try {
      const data = await this.userService.findOne(id);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Tạo user mới (ADMIN)' })
  async create(
    @Body() dto: CreateUserDto,
  ): Promise<ApiResponse<UserListItemDto>> {
    try {
      const data = await this.userService.create(dto);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Cập nhật user (ADMIN)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ApiResponse<UserListItemDto>> {
    try {
      const data = await this.userService.update(id, dto);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/status')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({
    summary: 'Cập nhật trạng thái người dùng (active, inactive) - ADMIN',
  })
  @ApiParam({
    name: 'id',
    required: true,
    example: 'user-uuid-id',
    description: 'ID của user',
  })
  @ApiBody({
    schema: {
      example: {
        status: 'active',
      },
    },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusUserDto,
  ) {
    try {
      const user = await this.userService.updateStatus(id, dto.status);
      return ApiResponseHelper.success(
        user,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/reset-password')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Admin đặt lại mật khẩu cho user (đặt thủ công)' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID của user',
  })
  @ApiBody({
    schema: {
      example: {
        newPassword: 'yourStrongPassword123',
      },
    },
  })
  async resetPasswordByAdmin(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    try {
      await this.userService.resetPasswordByAdmin(id, dto.newPassword);
      return ApiResponseHelper.success(
        null,
        'Đặt lại mật khẩu thành công',
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/restore')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Khôi phục user đã xóa mềm (ADMIN)' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID của user',
  })
  async restoreUser(@Param('id') id: string) {
    try {
      const data = await this.userService.restoreUser(id);
      return ApiResponseHelper.success(
        data,
        'Khôi phục tài khoản thành công',
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xóa mềm user (ADMIN)' })
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    try {
      await this.userService.delete(id);
      return ApiResponseHelper.success(
        null,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
