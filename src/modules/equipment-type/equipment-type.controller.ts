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
  CreateEquipmentTypeDto,
  EquipmentTypeDto,
  UpdateEquipmentTypeDto,
} from 'src/common/interfaces/dto/equipment-type.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EquipmentTypeService } from './equipment-type.service';

@ApiTags('Loại thiết bị')
@ApiBearerAuth('JWT-auth')
@Controller('equipment-types')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentTypeController {
  constructor(private readonly service: EquipmentTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách loại thiết bị (phân trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<ApiResponse<PaginatedResponse<EquipmentTypeDto>>> {
    try {
      const data = await this.service.findAll(Number(page), Number(limit));
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
  @ApiOperation({ summary: 'Xem loại thiết bị by id' })
  async getOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<EquipmentTypeDto>> {
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
  @ApiOperation({ summary: 'Tạo mới loại thiết bị' })
  async create(
    @Body() dto: CreateEquipmentTypeDto,
  ): Promise<ApiResponse<EquipmentTypeDto>> {
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
  @ApiOperation({ summary: 'Cập nhật loại thiết bị' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentTypeDto,
  ): Promise<ApiResponse<EquipmentTypeDto>> {
    try {
      const data = await this.service.update(id, dto);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa loại thiết bị' })
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
