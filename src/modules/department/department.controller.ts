import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentListItemDto,
  DepartmentItemDto,
} from 'src/common/interfaces/dto/department.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { RoleSystemName } from 'src/common/constants/roles_system';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Phòng ban')
@ApiBearerAuth('JWT-auth')
@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  /**
   * Lấy danh sách phòng ban (phân trang, tìm kiếm, sắp xếp)
   */
 @Get()
@Roles(RoleSystemName.ADMIN)
@ApiOperation({
  summary:
    'Lấy danh sách tất cả phòng ban (ADMIN - có phân trang, tìm kiếm, sắp xếp theo name)',
})
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
@ApiQuery({ name: 'search', required: false, type: String, example: 'HR' })
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
  @Query('search') search?: string,
  @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'ASC',
): Promise<ApiResponse<PaginatedResponse<DepartmentListItemDto>>> {
  try {
    const data = await this.departmentService.findAll(
      Number(page),
      Number(limit),
      search,
      sortOrder,
    );
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


  /**
   * Lấy chi tiết phòng ban theo ID
   */
  @Get(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xem chi tiết phòng ban (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của phòng ban' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<DepartmentListItemDto>> {
    try {
      const data = await this.departmentService.findOne(id);
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

  /**
   * Tạo phòng ban mới
   */
@Post()
@Roles(RoleSystemName.ADMIN)
@Permissions('department.create')
  @ApiOperation({ summary: 'Tạo phòng ban mới (ADMIN)' })
  async create(
    @Body() dto: CreateDepartmentDto,
  ): Promise<ApiResponse<DepartmentListItemDto>> {
    try {
      const data = await this.departmentService.create(dto);
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

  /**
   * Cập nhật thông tin phòng ban
   */
  @Patch(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Cập nhật phòng ban (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của phòng ban cần cập nhật' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ): Promise<ApiResponse<DepartmentListItemDto>> {
    try {
      const data = await this.departmentService.update(id, dto);
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

  /**
   * Xóa phòng ban
   */
  @Delete(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xóa phòng ban (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của phòng ban cần xóa' })
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    try {
      await this.departmentService.delete(id);
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


  @Get('getAll/forUser')
  @Roles(RoleSystemName.USER)
  @ApiOperation({ summary: 'Lấy danh sách department cho thiết bị' })
  async getForEquipment(): Promise<ApiResponse<DepartmentItemDto[]>> {
    try {
      const data = await this.departmentService.getAllForAddEquipment();
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
}
