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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import {
  ApproveMaterialSupplyBallotDto,
  CreateMaterialSupplyBallotWithDetailsDto,
  MaterialSupplyBallotListItemDto,
  ReportQueryDto,
  SignAndAdjustSuppliesDto,
} from 'src/common/interfaces/dto/material-supply-ballot.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { MaterialSupplyBallotService } from './material-supply-ballot.service';

@ApiTags('Phiếu xin cấp vật tư')
@ApiBearerAuth('JWT-auth')
@Controller('material-supply-ballots')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class MaterialSupplyBallotController {
  constructor(private readonly service: MaterialSupplyBallotService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo phiếu xin cấp vật tư (chưa sinh 01/02 SCTX)' })
  @Permissions('MSB.CREATE')
  async create(
    @Body() dto: CreateMaterialSupplyBallotWithDetailsDto,
    @UserDecorator('id') userId: string,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.create(dto, userId);
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

  @Get('deputy-foremen/:equipment_id')
  @ApiOperation({
    summary:
      'Lấy danh sách Phó quản đốc cơ điện hoặc Quản đốc của phòng ban quản lý thiết bị',
  })
  @ApiParam({ name: 'equipment_id', required: true, type: String })
  async getDeputyForemenByEquipment(
    @Param('equipment_id') equipment_id: string,
  ): Promise<ApiResponse<{ items: any[]; message?: string }>> {
    try {
      const data =
        await this.service.getDeputyForemenByEquipmentId(equipment_id);
      const message = data.message || ERROR_MESSAGES[ERROR_CODES.SUCCESS];
      return ApiResponseHelper.success(data, message, ERROR_CODES.SUCCESS);
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('prepare')
  @ApiOperation({
    summary:
      'Chuẩn bị tạo phiếu cho thiết bị: kiểm tra xung đột và gợi ý chi tiết còn thiếu',
  })
  @ApiQuery({ name: 'equipment_id', required: true, type: String })
  @Permissions('MSB.CREATE')
  async prepare(@Query('equipment_id') equipment_id: string) {
    try {
      const data = await this.service.prepareForEquipment(equipment_id);
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

  @Put(':id/approve')
  @ApiOperation({
    summary:
      'Duyệt phiếu xin cấp vật tư và tự sinh 01/02 SCTX, có thể điều chỉnh cấp độ sửa chữa ',
  })
  @Permissions('MSB.SIGN')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveMaterialSupplyBallotDto,
    @UserDecorator('id') approverId: string,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.approve(id, approverId, dto);
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

  @Put(':id/reject')
  @ApiOperation({
    summary: 'Từ chối phiếu xin cấp vật tư và xóa toàn bộ workitems liên quan',
  })
  @Permissions('MSB.SIGN')
  async reject(
    @Param('id') id: string,
    @UserDecorator('id') rejectorId: string,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.reject(id, rejectorId);
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

  @Put(':id/sign')
  @ApiOperation({ summary: 'Ký vào phiếu xin cấp vật tư theo position.code' })
  @Permissions('MSB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.sign(id, user);
      return ApiResponseHelper.success(data, 'Ký thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/sign-and-adjust-supplies')
  @ApiOperation({
    summary: 'Thủ kho ký và điều chỉnh số lượng thực cấp (quantity_supplies)',
  })
  @Permissions('MSB.SIGNUPDATE')
  async signAndAdjustSupplies(
    @Param('id') id: string,
    @Body() dto: SignAndAdjustSuppliesDto,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.signAndAdjustSupplies(id, dto, user);
      return ApiResponseHelper.success(
        data,
        'Ký và cập nhật số lượng thành công',
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('my-ballots')
  @ApiOperation({
    summary:
      'Danh sách tất cả phiếu xin cấp vật tư mà người dùng đã tạo (bất kể trạng thái)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['draft', 'pending', 'in_progress', 'rejected', 'completed'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC', 'asc', 'desc'],
  })
  @Permissions('MSB.VIEW')
  async findMyBallots(
    @UserDecorator('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status')
    status?: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done',
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ): Promise<ApiResponse<PaginatedResponse<MaterialSupplyBallotListItemDto>>> {
    try {
      const allowedSort = ['createdAt', 'updatedAt'];
      const sb: 'createdAt' | 'updatedAt' | undefined = allowedSort.includes(
        sortBy as any,
      )
        ? (sortBy as any)
        : undefined;
      const so: 'ASC' | 'DESC' | 'asc' | 'desc' | undefined =
        sortOrder && ['ASC', 'DESC', 'asc', 'desc'].includes(sortOrder)
          ? (sortOrder as any)
          : undefined;
      const data = await this.service.findByCreator(
        userId,
        Number(page),
        Number(limit),
        {
          search,
          status,
          sortBy: sb,
          sortOrder: so,
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

  @Get('drafts')
  @ApiOperation({
    summary:
      'Danh sách phiếu xin cấp vật tư bản nháp (phân trang, lọc, tìm kiếm)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'updatedAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC', 'asc', 'desc'],
  })
  @Permissions('MSB.VIEW')
  async findDrafts(
    @UserDecorator('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ): Promise<ApiResponse<PaginatedResponse<MaterialSupplyBallotListItemDto>>> {
    try {
      const allowedSort = ['createdAt', 'updatedAt'];
      const sb: 'createdAt' | 'updatedAt' | undefined = allowedSort.includes(
        sortBy as any,
      )
        ? (sortBy as any)
        : undefined;
      const so: 'ASC' | 'DESC' | 'asc' | 'desc' | undefined =
        sortOrder && ['ASC', 'DESC', 'asc', 'desc'].includes(sortOrder)
          ? (sortOrder as any)
          : undefined;
      const data = await this.service.findDrafts(Number(page), Number(limit), {
        search,
        sortBy: sb,
        sortOrder: so,
        userId,
      });
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

  @Put('drafts/:id')
  @ApiOperation({
    summary:
      'Cập nhật phiếu xin cấp vật tư bản nháp (chỉ có thể sửa khi status là draft)',
  })
  @ApiParam({ name: 'id', required: true, type: String })
  @Permissions('MSB.CREATE')
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: CreateMaterialSupplyBallotWithDetailsDto,
    @UserDecorator('id') userId: string,
  ): Promise<ApiResponse<MaterialSupplyBallotListItemDto>> {
    try {
      const data = await this.service.updateDraft(id, dto, userId);
      return ApiResponseHelper.success(
        data,
        'Cập nhật phiếu thành công',
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
  @ApiOperation({
    summary:
      'Xoá phiếu xin cấp vật tư, chỉ cho phép khi đang là bản nháp (draft)',
  })
  async deleteDraft(@Param('id') id: string) {
    try {
      const data = await this.service.deleteDraft(id);
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

  @Get('by-equipment/:equipment_id')
  @ApiOperation({ summary: 'Danh sách phiếu xin cấp vật tư của thiết bị' })
  @ApiParam({
    name: 'equipment_id',
    description: 'ID thiết bị',
    required: true,
  })
  @Permissions('MSB.VIEW')
  async findByEquipment(
    @Param('equipment_id') equipment_id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 100,
  ): Promise<ApiResponse<PaginatedResponse<MaterialSupplyBallotListItemDto>>> {
    try {
      const data = await this.service.findByEquipmentId(
        equipment_id,
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


  @Get(':id')
  @ApiOperation({
    summary: 'Chi tiết phiếu xin cấp vật tư (kèm details và quan hệ liên quan)',
  })
  @Permissions('MSB.VIEW')
  async findDetail(@Param('id') id: string): Promise<ApiResponse<any>> {
    try {
      const data: any = await this.service.findDetail(id);
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
