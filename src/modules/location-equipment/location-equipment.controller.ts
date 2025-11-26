import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LocationEquipmentService } from './location-equipment.service';
import {
  LocationEquipmentDto,
  CreateLocationEquipmentDto,
  UpdateLocationEquipmentDto,
} from 'src/common/interfaces/dto/location-equipment.dto';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  ApiResponse,
  PaginatedResponse,
  ApiResponseHelper,
} from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
@ApiTags('Vị trí thiết bị')
@ApiBearerAuth('JWT-auth')
@Controller('location-equipments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LocationEquipmentController {
  constructor(private readonly service: LocationEquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách vị trí thiết bị (phân trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, enum: ['code','name','createdAt'], example: 'code' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['ASC','DESC'], example: 'ASC' })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('sortBy') sortBy: 'code' | 'name' | 'createdAt' = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<ApiResponse<PaginatedResponse<LocationEquipmentDto>>> {
    try {
      const data = await this.service.findAll(Number(page), Number(limit), sortBy, sortOrder);
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
  @ApiOperation({ summary: 'Xem vị trí thiết bị by id' })
  async getOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<LocationEquipmentDto>> {
    try {
      const data = await this.service.findOne(id);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      if (error.name === 'NotFoundException') {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
          ERROR_CODES.RECORD_NOT_FOUND,
        );
      }
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Tạo mới vị trí thiết bị' })
  async create(
    @Body() dto: CreateLocationEquipmentDto,
  ): Promise<ApiResponse<LocationEquipmentDto>> {
    try {
      const data = await this.service.create(dto);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      if (error.name === 'ConflictException') {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD],
          ERROR_CODES.DUPLICATE_RECORD,
        );
      }
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật vị trí thiết bị' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationEquipmentDto,
  ): Promise<ApiResponse<LocationEquipmentDto>> {
    try {
      const data = await this.service.update(id, dto);
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      if (error.name === 'ConflictException') {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD],
          ERROR_CODES.DUPLICATE_RECORD,
        );
      }
      if (error.name === 'NotFoundException') {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
          ERROR_CODES.RECORD_NOT_FOUND,
        );
      }
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vị trí thiết bị' })
  async delete(@Param('id') id: string): Promise<ApiResponse<null>> {
    try {
      await this.service.delete(id);
      return ApiResponseHelper.success(
        null,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      if (error.name === 'NotFoundException') {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
          ERROR_CODES.RECORD_NOT_FOUND,
        );
      }
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
