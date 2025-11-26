import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import {
  MaterialUsageQueryDto,
  RepairRequestQueryDTO,
} from 'src/common/interfaces/dto/repair-request.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { RepairRequestService } from './repair-request.service';

@ApiTags('Yêu cầu sửa chữa')
@Controller('repair-requests')
export class RepairRequestController {
  constructor(private readonly repairRequestService: RepairRequestService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách yêu cầu sửa chữa (phân trang, lọc, tìm kiếm)',
  })
  async findAll(
    @Query('sort') sortQuery?: string,
    @Query() query?: RepairRequestQueryDTO,
  ) {
    const { from, to, page = 1, limit = 20, search } = query ?? {};

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to + ' 23:59:59') : undefined;

    let sortOptions: {
      field: 'start_date' | 'equipment_name' | 'equipment_code';
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
                field: 'start_date' | 'equipment_name' | 'equipment_code';
                order: 'ASC' | 'DESC';
              } =>
                ['start_date', 'equipment_name', 'equipment_code'].includes(
                  s.field,
                ) && ['ASC', 'DESC'].includes(s.order),
            )
            .map((s) => ({
              field: s.field as
                | 'start_date'
                | 'equipment_name'
                | 'equipment_code',
              order: s.order as 'ASC' | 'DESC',
            }));
        }
      } catch (error) {
        return ApiResponseHelper.error(
          error?.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
          error?.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
        );
      }
    }

    try {
      const data = await this.repairRequestService.findAll(
        Number(page),
        Number(limit),
        search,
        fromDate,
        toDate,
        sortOptions,
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

  @Get('statistics/material-usage')
  @ApiOperation({
    summary: 'Thống kê vật tư đã sử dụng theo khoảng thời gian (phân trang)',
  })
  async materialUsageSummary(
    @Query() query: MaterialUsageQueryDto,
  ): Promise<ApiResponse<PaginatedResponse<any>>> {
    try {
      const { from, to, movement, page = 1, limit = 20, search, sort } = query;

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to + ' 23:59:59') : undefined;

      let sortOptions: {
        field: 'name' | 'code' | 'quantity';
        order: 'ASC' | 'DESC';
      }[] = [{ field: 'name', order: 'ASC' }];

      if (sort) {
        try {
          const parsed = JSON.parse(sort);

          if (Array.isArray(parsed)) {
            sortOptions = parsed.filter(
              (
                s,
              ): s is {
                field: 'name' | 'code' | 'quantity';
                order: 'ASC' | 'DESC';
              } =>
                ['name', 'code', 'quantity'].includes(s.field) &&
                ['ASC', 'DESC'].includes(s.order),
            );
          }
        } catch {
          return ApiResponseHelper.error(
            'sort must be a valid JSON array',
            'E_SORT_JSON',
          );
        }
      }

      const data =
        await this.repairRequestService.getMaterialUsageStatisticsSummary(
          fromDate,
          toDate,
          movement,
          Number(page),
          Number(limit),
          search,
          sortOptions[0].field,
          sortOptions[0].order,
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

  @Get('statistics/material-usage/:materialId/usages')
  @ApiOperation({
    summary:
      'Chi tiết các lần sử dụng của 1 vật tư (phân trang, lọc thời gian, movement)',
  })
  @ApiParam({ name: 'materialId', required: true })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async materialUsageDetail(
    @Param('materialId') materialId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ApiResponse<any>> {
    try {
      const data =
        await this.repairRequestService.getMaterialUsagesByMaterialId(
          materialId,
          Number(page),
          Number(limit),
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

  @Get(':id/material-supply-ballots')
  @ApiOperation({
    summary:
      'Lấy tất cả phiếu xin cấp vật tư của 1 yêu cầu sửa chữa (có phân trang, search)',
  })
  @ApiParam({ name: 'id', required: true })
  async getMaterialSupplyBallots(
    @Param('id') id: string,
  ): Promise<ApiResponse<any>> {
    try {
      const data = await this.repairRequestService.getRepairRequestBallots(id);

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
