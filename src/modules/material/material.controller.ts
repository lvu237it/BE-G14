import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query, Res, Search, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { CreateMaterialDto, MaterialIemDto, MaterialListItemDto, UpdateMaterialDto } from 'src/common/interfaces/dto/material.dto';
import { ApiResponse, ApiResponseHelper, PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { MaterialService } from './material.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { Response as ExpressResponse } from 'express';

@ApiTags('Vật tư')
@ApiBearerAuth('JWT-auth')
@Controller('material')
export class MaterialController {
  constructor(
    private readonly materialService: MaterialService
  ) { }

@Get()
@ApiOperation({ summary: 'Xem danh sách vật tư (phân trang, tìm kiếm, lọc giá)' })
@ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
@ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
@ApiQuery({ name: 'search', required: false, type: String, example: 'bulong' })
@ApiQuery({ name: 'minPrice', required: false, type: Number, example: 10000 })
@ApiQuery({ name: 'maxPrice', required: false, type: Number, example: 50000 })
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
  @Query('search') search?: string,
  @Query('minPrice') minPrice?: number,
  @Query('maxPrice') maxPrice?: number,
): Promise<ApiResponse<PaginatedResponse<MaterialListItemDto>>> {
  try {
    const data = await this.materialService.findAll(
      Number(limit),
      Number(page),
      search,
      minPrice ? Number(minPrice) : undefined,
      maxPrice ? Number(maxPrice) : undefined,
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

  @Get('/getAll/repair')
  @ApiOperation({ summary: 'Lấy danh sách vật tư cho sửa chữa' })
  async getAll(): Promise<ApiResponse<MaterialIemDto[]>> {
    try {
      const response = await this.materialService.getAll()
      return ApiResponseHelper.success(
        response,
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


  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết vật tư' })
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<MaterialListItemDto>> {
    try {
      const data = await this.materialService.findById(id);
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
  @ApiOperation({ summary: 'Thêm mới vật tư' })
  async create(
    @Body() dto: CreateMaterialDto,
  ): Promise<ApiResponse<MaterialListItemDto>> {
    try {
      const data = await this.materialService.create(dto);
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

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin vật tư' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMaterialDto,
  ): Promise<ApiResponse<MaterialListItemDto>> {
    try {
      const data = await this.materialService.update(id, dto);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa vật tư' })
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.materialService.remove(id);
      return ApiResponseHelper.success(
        response,
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

@Get('template/download')
async downloadTemplate(@Res() res: ExpressResponse) {
  const file = await this.materialService.downloadTemplate();
  const stream = file.getStream();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="material_template.xlsx"'
  );

  stream.pipe(res);
}

@Post('template/import')
@ApiOperation({ summary: 'Nhập danh sách vật tư từ file Excel' })
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
      return cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
    }
    cb(null, true);
  },
}))
async importTemplate(
  @UploadedFile() file: Express.Multer.File,
  @Res() res: ExpressResponse
) {
  try {
    const result = await this.materialService.importTemplate(file);

    if ((result as any).errorFile) {
      const buffer = (result as any).errorFile as Buffer;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="material_import_errors.xlsx"'
      );

      // Dùng PassThrough stream để gửi buffer
      const { PassThrough } = require('stream');
      const bufferStream = new PassThrough();
      bufferStream.end(buffer);

      bufferStream.pipe(res);
      return; // dừng, không trả JSON nữa
    }

    // Nếu không có lỗi => trả JSON
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
@ApiOperation({ summary: 'Xuất danh sách vật tư ra Excel' })
async exportExcel(@Res() res: ExpressResponse) {
  const file = await this.materialService.exportExcel();
  const stream = file.getStream();

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="material_export.xlsx"'
  );

  stream.pipe(res);
}

@Get('export/excel-current')
@ApiOperation({ summary: 'Xuất danh sách vật tư ra Excel trang hiện tại' })
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
  const file = await this.materialService.exportExcelCurrentPage(
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
    'attachment; filename="material_export_page.xlsx"'
  );

  stream.pipe(res);
}


}
