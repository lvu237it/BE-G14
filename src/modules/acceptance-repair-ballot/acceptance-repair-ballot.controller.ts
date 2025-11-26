import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import { AcceptanceRepairBallotListItemDto } from 'src/common/interfaces/dto/acceptance-repair-ballot.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { AcceptanceRepairBallotService } from './acceptance-repair-ballot.service';

@ApiTags('Phiếu nghiệm thu sửa chữa')
@ApiBearerAuth('JWT-auth')
@Controller('acceptance-repair-ballot')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AcceptanceRepairBallotController {
  constructor(
    private readonly acceptanceRepairBallotService: AcceptanceRepairBallotService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Xem danh sách phiếu nghiệm thu sửa chữa (phân trang)',
  })
  @Permissions('ARB.VIEW')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'done'],
  })
  @ApiQuery({ name: 'equipment_id', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'status', 'createdAt', 'updatedAt'],
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
    @Query('status') status?: 'pending' | 'done',
    @Query('equipment_id') equipment_id?: string,
    @Query('sortBy')
    sortBy?: 'name' | 'status' | 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ): Promise<
    ApiResponse<PaginatedResponse<AcceptanceRepairBallotListItemDto>>
  > {
    try {
      const data = await this.acceptanceRepairBallotService.findAll(
        Number(page),
        Number(limit),
        {
          search,
          status,
          equipment_id,
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
  @ApiOperation({ summary: 'Xem chi tiết phiếu nghiệm thu sửa chữa' })
  // @Permissions('ARB.VIEW')
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<AcceptanceRepairBallotListItemDto>> {
    try {
      const data = await this.acceptanceRepairBallotService.findOne(id);
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
  
  @Put(':id/create')
  @ApiOperation({
    summary: 'Xác nhận tại phiếu',
  })
  // @Permissions('ARB.SIGN')
  async create(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<AcceptanceRepairBallotListItemDto>> {
    try {
      const data = await this.acceptanceRepairBallotService.create(id, user);
      return ApiResponseHelper.success(data, 'Tạo phiếu thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/sign')
  @ApiOperation({
    summary: 'Ký vào phiếu giao việc sửa chữa theo position.code',
  })
  @Permissions('ARB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<AcceptanceRepairBallotListItemDto>> {
    try {
      const data = await this.acceptanceRepairBallotService.sign(id, user);
      return ApiResponseHelper.success(data, 'Ký thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
