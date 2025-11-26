import { Controller, Get, Param, Query } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { ApiResponseHelper } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { ApiQuery } from '@nestjs/swagger';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiQuery({ name: 'search', required: false, type: String, example: 'Equip' })
  async findAll(@Query('search') search?: string) {
    try {
      const data = await this.permissionService.findAll(search);
      return ApiResponseHelper.success(
        data,
        'Lấy danh sách tất cả quyền thành công',
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || 'Lỗi hệ thống khi lấy danh sách quyền',
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getPermissionsByUserId(@Param('userId') userId: string) {
    try {
      const data = await this.permissionService.getPermissionsByUserId(userId);
      return ApiResponseHelper.success(
        data,
        'Lấy danh sách quyền của người dùng thành công',
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || 'Lỗi hệ thống khi lấy quyền của người dùng',
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
