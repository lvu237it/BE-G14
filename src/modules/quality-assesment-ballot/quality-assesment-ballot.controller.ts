// src/modules/quality-assessment-ballot/quality-assessment-ballot.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import {
  QualityAssessmentBallotListItemDto,
  QualityAssessmentBallotUpdateItemsDto,
} from 'src/common/interfaces/dto/quality-assessment-ballot.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { QualityAssessmentBallotService } from './quality-assesment-ballot.service';

@ApiTags('BIÊN BẢN ĐÁNH GIÁ CHẤT LƯỢNG VẬT TƯ PHỤ TÙNG THU HỒI SAU SỬA CHỮA ')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('quality-assessment-ballots')
export class QualityAssessmentBallotController {
  constructor(private readonly qabService: QualityAssessmentBallotService) {}

  @Get()
  @ApiOperation({
    summary:
      'Danh sách biên bản đánh giá chất lượng vật tư phụ tùng thu hồi sau sửa chữa',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'equipment_id', required: false })
  @ApiQuery({ name: 'request_no', required: false })
  @ApiQuery({ name: 'deputy_director_id', required: false })
  @ApiQuery({ name: 'lead_finance_accounting_id', required: false })
  @ApiQuery({ name: 'lead_first_plan', required: false })
  @ApiQuery({ name: 'lead_transport_mechanic', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Permissions('QAB.VIEW')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query() filters?: any,
  ): Promise<PaginatedResponse<QualityAssessmentBallotListItemDto>> {
    return this.qabService.findAll(+page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'BIÊN BẢN ĐÁNH GIÁ CHẤT LƯỢNG VẬT TƯ PHỤ TÙNG THU HỒI SAU SỬA CHỮA Bởi id',
  })
  @Permissions('QAB.VIEW')
  async findOne(
    @Param('id') id: string,
  ): Promise<QualityAssessmentBallotListItemDto> {
    return this.qabService.findOne(id);
  }

  @Patch(':id/approve-create')
  @ApiOperation({ summary: 'Xác nhận tạo phiếu đánh giá chất lượng' })
  @ApiParam({ name: 'id', description: 'ID phiếu đánh giá chất lượng' })
  @ApiBody({ type: QualityAssessmentBallotUpdateItemsDto })
  @Permissions('QAB.CREATE')
  async approveCreate(
    @Param('id') id: string,
    @Body() dto: QualityAssessmentBallotUpdateItemsDto,
    @UserDecorator() user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    return this.qabService.approveCreate(id, dto, user);
  }

  @Patch(':id/update-item')
  @ApiOperation({ summary: 'Cập nhật phiếu đánh giá chất lượng' })
  @ApiParam({ name: 'id', description: 'ID phiếu đánh giá chất lượng' })
  @ApiBody({ type: QualityAssessmentBallotUpdateItemsDto })
  @Permissions('QAB.UPDATE')
  async updateItem(
    @Param('id') id: string,
    @Body() dto: QualityAssessmentBallotUpdateItemsDto,
    @UserDecorator() user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    return this.qabService.updateItems(id, dto, user);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Xác nhận tạo phiếu đánh giá chất lượng' })
  @Permissions('QAB.APPROVE')
  async approve(@Param('id') id: string, @UserDecorator() user: any) {
    return await this.qabService.approve(id, user);
  }

  @Put(':id/final-approve')
  @ApiOperation({ summary: 'Phê duyệt phiếu đánh giá chất lượng' })
  @Permissions('QAB.FINAL')
  async finalApprove(@Param('id') id: string, @UserDecorator() user: any) {
    return await this.qabService.finalApprove(id, user);
  }

  @Put(':id/reject')
  @ApiOperation({ summary: 'Từ chối phiếu đánh giá chất lượng' })
  @Permissions('QAB.REJECT')
  async reject(@Param('id') id: string, @UserDecorator() user: any) {
    return await this.qabService.reject(id, user);
  }

  @Put(':id/sign')
  @ApiOperation({
    summary: 'Ký vào phiếu đánh giá chất lượng theo position.code',
  })
  @Permissions('QAB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<QualityAssessmentBallotListItemDto>> {
    try {
      const data = await this.qabService.sign(id, user);
      return ApiResponseHelper.success(data, 'Ký thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
