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
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import {
  CreateEquipmentDto,
  EquipmentItemDto,
  EquipmentListItemDto,
  UpdateEquipmentDto,
} from 'src/common/interfaces/dto/equipment.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { EquipmentService } from './equipment.service';
import { DepartmentListItemDto } from 'src/common/interfaces/dto/department.dto';
import { ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Response as ExpressResponse } from 'express';

@ApiTags('Thiết bị')
@ApiBearerAuth('JWT-auth')
@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: 'Xem danh sách thiết bị (phân trang)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'maintenance', 'broken'],
  })
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
  ): Promise<ApiResponse<PaginatedResponse<EquipmentListItemDto>>> {
    try {
      const data = await this.equipmentService.findAll(
        Number(page),
        Number(limit),
        {
          search,
          status,
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

  @Get(':id/department')
  @ApiOperation({ summary: 'Xem phòng ban quản lý thiết bị' })
  @ApiParam({ name: 'id', description: 'ID thiết bị' })
  @Permissions('EQUIP.VIEW')
  async getDepartmentByEquipmentId(
    @Param('id') id: string,
  ): Promise<ApiResponse<DepartmentListItemDto>> {
    try {
      const data = await this.equipmentService.getDepartmentByEquipmentId(id);
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
  @ApiOperation({ summary: 'Xem chi tiết thiết bị' })
  @ApiParam({ name: 'id', description: 'ID thiết bị' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<EquipmentListItemDto>> {
    try {
      const data = await this.equipmentService.findOne(id);
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
  @ApiOperation({ summary: 'Thêm mới thiết bị' })
  async create(
    @Body() dto: CreateEquipmentDto,
  ): Promise<ApiResponse<EquipmentListItemDto>> {
    try {
      const data = await this.equipmentService.create(dto);
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
  @ApiOperation({ summary: 'Cập nhật thông tin thiết bị' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEquipmentDto,
  ): Promise<ApiResponse<EquipmentListItemDto>> {
    try {
      const data = await this.equipmentService.update(id, dto);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thiết bị' })
  async remove(@Param('id') id: string): Promise<ApiResponse<null>> {
    try {
      await this.equipmentService.delete(id);
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

  @Get('/getAll/repair')
  @ApiOperation({ summary: 'Lấy danh sách thiết bị' })
  async getAll(
    @Query('search') search?: string,
  ): Promise<ApiResponse<EquipmentItemDto[]>> {
    try {
      const response = await this.equipmentService.getAll(search);
      return ApiResponseHelper.success(
        response,
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

@Get('template/download')
async downloadTemplate(@Res() res: ExpressResponse) {
  const file = await this.equipmentService.downloadTemplate();
  const stream = file.getStream();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="equipment_template.xlsx"'
  );

  stream.pipe(res);
}

@Post('template/import')
@ApiOperation({ summary: 'Nhập danh sách thiết bị từ file Excel' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  description: 'Upload file Excel (.xlsx)',
  schema: {
    type: 'object',
    properties: { file: { type: 'string', format: 'binary' } },
  },
})
@UseInterceptors(FileInterceptor('file', {
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error('Chỉ chấp nhận file Excel'), false);
    }
    cb(null, true);
  },
}))
async importTemplate(
  @UploadedFile() file: Express.Multer.File,
  @Res() res: ExpressResponse
) {
  try {
    const result = await this.equipmentService.importTemplate(file);

    // Nếu có file lỗi, trả về file Excel
    if (result.errorFile) {
      const buffer = result.errorFile as Buffer;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="equipment_import_errors.xlsx"'
      );

      const { PassThrough } = require('stream');
      const bufferStream = new PassThrough();
      bufferStream.end(buffer);

      bufferStream.pipe(res);
      return;
    }

    // Không lỗi => trả JSON
    res.json(
      ApiResponseHelper.success(
        {
          imported: result.imported,
          skipped: result.skipped,
          total: result.total,
          message: result.message,
        },
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS
      )
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Internal Server Error',
      error: error.message,
    });
  }
}



@Get('export/excel')
@ApiOperation({ summary: 'Xuất danh sách thiết bị ra Excel' })
async exportExcel(@Res() res: ExpressResponse) {
  const file = await this.equipmentService.exportExcel();
  const stream = file.getStream();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="equipment_export.xlsx"'
  );

  stream.pipe(res);
}

@Get('export/excel-current')
@ApiOperation({ summary: 'Xuất danh sách thiết bị ra Excel trang hiện tại' })
@ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang hiện tại' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số bản ghi/trang' })
@ApiQuery({ name: 'name', required: false, type: String, description: 'Filter theo tên vật tư' })
@ApiQuery({ name: 'code', required: false, type: String, description: 'Filter theo mã vật tư' })
async exportExcelCurrent(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('name') name: string,
  @Query('code') code: string,
  @Res() res: ExpressResponse
) {
  const file = await this.equipmentService.exportExcelCurrentPage(
    page,
    limit,
    { name, code }
  );

  const stream = file.getStream();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="equipment_export_page.xlsx"'
  );

  stream.pipe(res);
}

}
