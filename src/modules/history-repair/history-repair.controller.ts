import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import {
  HistoryRepairQueryDto,
  ReportQueryDto,
} from 'src/common/interfaces/dto/material-supply-ballot.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { HistoryRepairService } from './history-repair.service';

@ApiTags('Lịch sử sửa chữa')
@Controller('history-repairs')
export class HistoryRepairController {
  constructor(private readonly service: HistoryRepairService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách lịch sử sửa chữa (phân trang, lọc, tìm kiếm)',
  })
  async findAll(
    @Query('sort') sortQuery?: string,
    @Query() query?: HistoryRepairQueryDto,
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        start_date,
        end_date,
      } = query ?? {};

      let sortOptions: {
        field: 'equipment_name' | 'equipment_code' | 'start_date' | 'end_date';
        order: 'ASC' | 'DESC';
      }[] = [{ field: 'start_date', order: 'DESC' }];

      if (sortQuery) {
        try {
          const parsed = JSON.parse(sortQuery);
          if (Array.isArray(parsed)) {
            sortOptions = parsed
              .filter(
                (
                  s,
                ): s is {
                  field:
                    | 'equipment_name'
                    | 'equipment_code'
                    | 'start_date'
                    | 'end_date';
                  order: 'ASC' | 'DESC';
                } =>
                  [
                    'equipment_name',
                    'equipment_code',
                    'start_date',
                    'end_date',
                  ].includes(s.field) && ['ASC', 'DESC'].includes(s.order),
              )
              .map((s) => ({
                field: s.field,
                order: s.order,
              }));
          }
        } catch (e) {
          return ApiResponseHelper.error(
            'sort must be JSON array',
            'E_SORT_JSON',
          );
        }
      }

      const data = await this.service.findAll(
        Number(page),
        Number(limit),
        search,
        status,
        start_date,
        end_date,
        sortOptions,
      );

      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message,
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('report-equipment')
  async reportEquipment(
    @Query('sort') sortQuery?: string,
    @Query() query?: ReportQueryDto,
  ) {
    const { from, to, page = 1, limit = 20, search } = query ?? {};

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to + ' 23:59:59') : undefined;

    let sortOptions: {
      field: 'name' | 'code' | 'repair_count';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'name', order: 'ASC' }];

    if (sortQuery) {
      try {
        const parsed = JSON.parse(sortQuery);
        if (Array.isArray(parsed)) {
          sortOptions = parsed
            .filter(
              (
                s,
              ): s is {
                field: 'name' | 'code' | 'repair_count';
                order: 'ASC' | 'DESC';
              } =>
                ['name', 'code', 'repair_count'].includes(s.field) &&
                ['ASC', 'DESC'].includes(s.order),
            )
            .map((s) => ({
              field: s.field as 'name' | 'code' | 'repair_count',
              order: s.order as 'ASC' | 'DESC',
            }));
        }
      } catch {}
    }

    return this.service.reportEquipment(
      Number(page),
      Number(limit),
      fromDate,
      toDate,
      search,
      sortOptions,
    );
  }

  @Get('report-equipment/export/excel')
  @ApiOperation({ summary: 'Xuất báo cáo thiết bị ra Excel' })
  async exportReportEquipment(
    @Res() res: ExpressResponse,
    @Query('sort') sortQuery?: string,
    @Query() query?: ReportQueryDto,
  ) {
    const { from, to, search } = query ?? {};

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to + ' 23:59:59') : undefined;

    let sortOptions: {
      field: 'name' | 'code' | 'repair_count';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'name', order: 'ASC' }];

    if (sortQuery) {
      try {
        const parsed = JSON.parse(sortQuery);
        if (Array.isArray(parsed)) {
          sortOptions = parsed
            .filter(
              (
                s,
              ): s is {
                field: 'name' | 'code' | 'repair_count';
                order: 'ASC' | 'DESC';
              } =>
                ['name', 'code', 'repair_count'].includes(s.field) &&
                ['ASC', 'DESC'].includes(s.order),
            )
            .map((s) => ({
              field: s.field as 'name' | 'code' | 'repair_count',
              order: s.order as 'ASC' | 'DESC',
            }));
        }
      } catch {
        // nếu parse lỗi thì dùng mặc định
      }
    }

    const file = await this.service.exportReportEquipmentExcel(
      fromDate,
      toDate,
      search,
      sortOptions,
    );

    const stream = file.getStream();

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="report_equipment.xlsx"',
    );

    stream.pipe(res);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Chi tiết lịch sử sửa chữa (bao gồm tất cả các phiếu 1-6 và phiếu xin cấp vật tư đã gộp)',
  })
  @ApiParam({ name: 'id', description: 'ID của lịch sử sửa chữa' })
  async findOne(@Param('id') id: string): Promise<ApiResponse<any>> {
    try {
      const data = await this.service.findOne(id);

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
