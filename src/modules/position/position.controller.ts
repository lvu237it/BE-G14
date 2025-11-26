import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  Request,
  UseGuards
} from '@nestjs/common';
import { PositionService } from './position.service';
import {
  AssignPermissionsDto,
  CreatePositionDto,
  UpdatePositionDto,
} from 'src/common/interfaces/dto/position.dto';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { ApiOperation, ApiQuery ,ApiParam, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionService } from '../permission/permission.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleSystemName } from 'src/common/constants/roles_system';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { ApiResponseHelper } from 'src/common/interfaces/response/api-response.interface';
@ApiTags('Chức vụ')
@ApiBearerAuth('JWT-auth')
@Controller('positions')
@UseGuards(JwtAuthGuard, RolesGuard,PermissionsGuard)
export class PositionController {
  constructor(private readonly positionService: PositionService,private readonly permissionService: PermissionService,) {}

  @Get()
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({
    summary: 'Lấy danh sách tất cả chức danh (ADMIN - có phân trang, tìm kiếm, sắp xếp, lọc)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'giám đốc' })
@ApiQuery({
    name: 'sortOrder',
    required: false,
    type: String,
    enum: ['ASC', 'DESC'],
    example: 'ASC',
  })
  @ApiQuery({ name: 'departmentId', required: false, type: String, example: '238fee7b-0d41-4b7b-b3fa-d459ace66a0c' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('departmentId') departmentId?: string,
  ) {
    try {
          const data = await this.positionService.findAll(
      Number(page),
      Number(limit),
      search,
      sortOrder,
      departmentId,
    );

    return ApiResponseHelper.success (
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


  @Get(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xem chi tiết chức danh (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của chức danh' })
  async findOne(@Param('id') id: string) {
    try {
          const data = await this.positionService.findOne(id);
     return ApiResponseHelper.success (
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
  @ApiOperation({ summary: 'Tạo chức danh mới (ADMIN)' })
  async create(@Body() dto: CreatePositionDto) {
    try {
       const data = await this.positionService.create(dto);
      return ApiResponseHelper.success (
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

  @Patch(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Cập nhật chức danh (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của chức danh cần cập nhật' })
  async update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    try {
    const data = await this.positionService.update(id, dto);
     return ApiResponseHelper.success (
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

  @Delete(':id')
  @Roles(RoleSystemName.ADMIN)
  @ApiOperation({ summary: 'Xóa chức danh (ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID của chức danh cần xóa' })
  async delete(@Param('id') id: string) {
    try {
    await this.positionService.delete(id);
     return ApiResponseHelper.success (
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

 @Get(':id/permissions')
 @Roles(RoleSystemName.ADMIN)
 @ApiOperation({ summary: 'Xem quyền (ADMIN)' })
 @ApiParam({ name: 'id', description: 'UUID của chức danh' })
async getPermissions(@Param('id') id: string) {
  try {
     const data = await this.positionService.findOneWithPermissions(id);
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

 @Get(':id/department')
 @Roles(RoleSystemName.ADMIN)
 @ApiOperation({ summary: 'Xem chức vụ theo phòng ban (ADMIN)' })
 @ApiParam({ name: 'id', description: 'UUID của phòng ban' })
async getPositionByDepartment(@Param('id') id: string) {
  try {
     const data = await this.positionService.findPositionByDepartment(id);
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

@Post(':id/permissions')
@Roles(RoleSystemName.ADMIN)

 @ApiOperation({ summary: 'Thêm quyền (ADMIN)' })
 @ApiParam({ name: 'id', description: 'UUID của chức danh' })
async assignPermissions(
  @Param('id') id: string,
  @Body() dto: AssignPermissionsDto,
  @Request() req: any,
) {
  try {
    const data = await this.positionService.assignPermissions(req, id, dto.permissionIds,);
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


