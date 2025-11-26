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
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import {
  CreateEquipmentDto,
  EquipmentListItemDto,
  HistoryEquipmentListItemDto,
  UpdateEquipmentDto,
} from 'src/common/interfaces/dto/equipment.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HistoryEquipmentService } from './history-equipment.service';

@ApiTags('Thiết bị')
@ApiBearerAuth('JWT-auth')
@Controller('history-equiment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistoryEquipmentController {
  constructor(private readonly historyEquipmentService: HistoryEquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Xem danh sách lịch sử thiết bị (phân trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'maintenance', 'broken'],
  })
  @ApiQuery({ name: 'equipment_id', required: false, type: String })
  @ApiQuery({ name: 'equipment_type_id', required: false, type: String })
  @ApiQuery({ name: 'department_id', required: false, type: String })
  @ApiQuery({ name: 'location_id', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'inventory_number', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'code',
      'name',
      'inventory_number',
      'status',
      'createdAt',
      'updatedAt',
    ],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC', 'asc', 'desc'],
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'maintenance' | 'broken',
    @Query('equipment_id') equipment_id?: string,
    @Query('equipment_type_id') equipment_type_id?: string,
    @Query('department_id') department_id?: string,
    @Query('location_id') location_id?: string,
    @Query('code') code?: string,
    @Query('name') name?: string,
    @Query('inventory_number') inventory_number?: string,
    @Query('sortBy')
    sortBy?:
      | 'code'
      | 'name'
      | 'inventory_number'
      | 'status'
      | 'createdAt'
      | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ): Promise<ApiResponse<PaginatedResponse<HistoryEquipmentListItemDto>>> {
    try {
      const data = await this.historyEquipmentService.findAll(
        Number(page),
        Number(limit),
        {
          search,
          status,
          equipment_id,
          equipment_type_id,
          department_id,
          location_id,
          code,
          name,
          inventory_number,
          sortBy,
          sortOrder,
        },
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

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết lịch sử thiết bị' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<HistoryEquipmentListItemDto>> {
    try {
      const data = await this.historyEquipmentService.findOne(id);
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
