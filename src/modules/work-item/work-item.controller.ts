import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import {
  WorkItemListItemDto,
  WorkItemQueryDto,
} from 'src/common/interfaces/dto/work-item.dto';
import {
  ApiResponse,
  ApiResponseHelper,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { WorkItemService } from './work-item.service';

@ApiTags('Danh sách công việc')
@ApiBearerAuth('JWT-auth')
@Controller('work-items')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class WorkItemController {
  constructor(private readonly workItemService: WorkItemService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách công việc của user đăng nhập',
  })
  async getMyWorkItems(
    @UserDecorator() user: any,
    @Query('sort') sortQuery?: string,
    @Query() query?: WorkItemQueryDto,
  ) {
    try {
      const { from, to, page = 1, limit = 20, search } = query ?? {};

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to + ' 23:59:59') : undefined;

      let sortOptions: {
        field: 'start_date' | 'task_name' | 'ballot_name';
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
                  field: 'start_date' | 'task_name' | 'ballot_name';
                  order: 'ASC' | 'DESC';
                } =>
                  ['start_date', 'task_name', 'ballot_name'].includes(
                    s.field,
                  ) && ['ASC', 'DESC'].includes(s.order),
              )
              .map((s) => ({
                field: s.field as 'start_date' | 'task_name' | 'ballot_name',
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

      const data = await this.workItemService.findByUser(
        user.id,
        'pending',
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

  @Get('completed')
  @ApiOperation({
    summary: 'Danh sách công việc đã hoàn thành của user đăng nhập',
  })
  async getMyCompletedWorkItems(
    @UserDecorator() user: any,
    @Query('sort') sortQuery?: string,
    @Query() query?: WorkItemQueryDto,
  ): Promise<
    ApiResponse<{
      items: WorkItemListItemDto[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>
  > {
    try {
      const { from, to, page = 1, limit = 20, search } = query ?? {};

      const pageNum = Number(page);
      const limitNum = Number(limit);
      const safePage = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
      const safeLimit =
        Number.isFinite(limitNum) && limitNum > 0 ? limitNum : 20;

      const fromDate = from ? new Date(from) : undefined;
      const toDate = to ? new Date(to + ' 23:59:59') : undefined;

      let sortOptions: {
        field: 'start_date' | 'task_name' | 'ballot_name';
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
                  field: 'start_date' | 'task_name' | 'ballot_name';
                  order: 'ASC' | 'DESC';
                } =>
                  ['start_date', 'task_name', 'ballot_name'].includes(
                    s.field,
                  ) && ['ASC', 'DESC'].includes(s.order),
              )
              .map((s) => ({
                field: s.field as 'start_date' | 'task_name' | 'ballot_name',
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

      const data = await this.workItemService.findByUser(
        user.id,
        'completed',
        safePage,
        safeLimit,
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
}
