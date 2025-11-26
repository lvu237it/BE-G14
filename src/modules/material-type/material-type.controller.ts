import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { CreateMaterialTypeDto, MaterialTypeDto, UpdateMaterialTypeDto } from 'src/common/interfaces/dto/material-type.dto';
import { ApiResponse, ApiResponseHelper } from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaterialTypeService } from './material-type.service';
@ApiTags('Loại vật tư')
@ApiBearerAuth('JWT-auth')
@Controller('material-type')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialTypeController {
  constructor(private readonly materialTypeService: MaterialTypeService) { }

  @Get()
  @ApiOperation({ summary: 'Lấy danh loại vật tư' })
  async findAll(): Promise<ApiResponse<MaterialTypeDto[]>> {
    try {
      const data = await this.materialTypeService.findAll();
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      let errCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message = ERROR_MESSAGES[errCode];
      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        errCode = response?.errCode || errCode;
        message = response?.message || message;
      }

      return ApiResponseHelper.error(message, errCode);
    }
  }

  @Post()
  @ApiOperation({ summary: 'Thêm mới loại vật tư' })
  async create(@Body() dto: CreateMaterialTypeDto): Promise<ApiResponse<MaterialTypeDto>> {
    try {
      const response = await this.materialTypeService.create(dto);
      return ApiResponseHelper.success(
        response,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS
      )
    } catch (error) {
      let errCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message = ERROR_MESSAGES[errCode];
      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        errCode = response?.errCode || errCode;
        message = response?.message || message;
      }

      return ApiResponseHelper.error(message, errCode);
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Chỉnh sửa loại vật tư' })
  async update(@Body() dto: UpdateMaterialTypeDto, @Param('id') id: string): Promise<ApiResponse<MaterialTypeDto>> {
    try {
      const response = await this.materialTypeService.update(id, dto);
      return ApiResponseHelper.success(
        response,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS
      )
    } catch (error) {
      let errCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message = ERROR_MESSAGES[errCode];
      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        errCode = response?.errCode || errCode;
        message = response?.message || message;
      }

      return ApiResponseHelper.error(message, errCode);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa loại vật tư' })
  async delete(@Param('id') id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.materialTypeService.remove(id);
      return ApiResponseHelper.success(
        response,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS
      )
    } catch (error) {
      let errCode = ERROR_CODES.INTERNAL_SERVER_ERROR;
      let message = ERROR_MESSAGES[errCode];
      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        errCode = response?.errCode || errCode;
        message = response?.message || message;
      }

      return ApiResponseHelper.error(message, errCode);
    }
  }

}
