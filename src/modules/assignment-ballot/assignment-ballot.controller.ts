import {
  BadRequestException,
  Body,
  Controller,
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
import { User } from 'src/common/decorators/user.decorator';
import {
  AssignmentBallotApprovalListItemDto,
  AssignmentBallotCreateDto,
  AssignmentBallotListItemDto,
  DelegateAssignmentBallotDto,
  DelegateAssignmentBallotOtherDto,
} from 'src/common/interfaces/dto/assignment-ballot.dto';
import {
  ApiResponse,
  ApiResponseHelper,
  PaginatedResponse,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignmentBallotService } from './assignment-ballot.service';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';

@ApiTags('Phiếu giao việc sửa chữa')
@ApiBearerAuth('JWT-auth')
@Controller('assignment-ballot')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class AssignmentBallotController {
  constructor(
    private readonly assignmentBallotService: AssignmentBallotService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Xem danh sách phiếu giao việc (phân trang)' })
  @Permissions('ASB.VIEW')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected'],
  })
  @ApiQuery({ name: 'equipment_id', required: false, type: String })
  @ApiQuery({ name: 'department_repair_id', required: false, type: String })
  @ApiQuery({ name: 'assign_by', required: false, type: String })
  @ApiQuery({ name: 'equipment_id', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'description', required: false, type: String })
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
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
    @Query('equipment_id') equipment_id?: string,
    @Query('department_repair_id') department_repair_id?: string,
    @Query('assign_by') assign_by?: string,
    @Query('name') name?: string,
    @Query('description') description?: string,
    @Query('sortBy')
    sortBy?: 'name' | 'status' | 'createdAt' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc',
  ): Promise<ApiResponse<PaginatedResponse<AssignmentBallotListItemDto>>> {
    try {
      const data = await this.assignmentBallotService.findAll(
        Number(page),
        Number(limit),
        {
          search,
          status,
          equipment_id,
          department_repair_id,
          assign_by,
          name,
          description,
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

  @Get('deputyforemen')
  @ApiOperation({
    summary:
      'Lấy danh sách Phó Quản Đốc (Deputy Foreman) theo phòng ban sửa chữa',
  })
  @ApiQuery({ name: 'department_id', required: true, type: String })
  async listDeputyForemen(
    @Query('department_id') department_id: string,
  ): Promise<ApiResponse<any[]>> {
    try {
      const data =
        await this.assignmentBallotService.listDeputyForemen(department_id);
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

  @Get('operators')
  @ApiOperation({
    summary: 'Lấy danh sách Người vận hành (Operator) theo phòng ban sửa chữa',
  })
  @ApiQuery({ name: 'department_id', required: true, type: String })
  async listOperators(
    @Query('department_id') department_id: string,
  ): Promise<ApiResponse<any[]>> {
    try {
      const data =
        await this.assignmentBallotService.listOperators(department_id);
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
  @ApiOperation({ summary: 'Xem phiếu giao việc sửa chữa' })
  @Permissions('ASB.VIEW')
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<AssignmentBallotListItemDto>> {
    try {
      const data = await this.assignmentBallotService.findOne(id);
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

  @Put(':id/delegate')
  @ApiOperation({
    summary: 'Ủy quyền và giao việc (Quản đốc → PQĐ, PQĐ → Tổ trưởng)',
  })
  async delegate(
    @Param('id') id: string,
    @Body() dto: DelegateAssignmentBallotDto,
    @User() user: any,
  ): Promise<ApiResponse<void>> {
    try {
      await this.assignmentBallotService.delegate(id, user.userId, dto);
      return ApiResponseHelper.success(
        null,
        'Ủy quyền thành công',
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
  @ApiOperation({
    summary: 'Ký vào phiếu giao việc sửa chữa theo position.code',
  })
  @Permissions('ASB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<AssignmentBallotListItemDto>> {
    try {
      const data = await this.assignmentBallotService.sign(id, user);
      return ApiResponseHelper.success(data, 'Ký thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/approve-sign')
  @ApiOperation({ summary: 'Xác nhận công việc' })
  @Permissions('ASB.AUTHORITY_FOR_DEPUTY_FOREMAN')
  async approveSign(
    @Param('id') id: string,
    @UserDecorator() user: any,
    @Body() body: DelegateAssignmentBallotOtherDto,
  ): Promise<ApiResponse<AssignmentBallotApprovalListItemDto>> {
    try {
      const data = await this.assignmentBallotService.approveJob(id,user,body);
      return ApiResponseHelper.success(
        data,
        'Xác nhận công việc ủy quyền thành công',
      );
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/approve-sign-lead')
  @ApiOperation({ summary: 'Xác nhận công việc tổ trường' })
  @Permissions('ASB.AUTHORITY_FOR_OPERATOR')
  async approveSignLead(
    @Param('id') id: string,
    @UserDecorator() user: any,
    @Body() body: DelegateAssignmentBallotOtherDto,
  ): Promise<ApiResponse<AssignmentBallotApprovalListItemDto>> {
    try {
      const data = await this.assignmentBallotService.approveJobByLead(id,user,body);
      return ApiResponseHelper.success(
        data,
        'Xác nhận công việc ủy quyền thành công',
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
      'Phê duyệt phiếu giao việc sửa chữa (ID là ID bảng assignment_ballot)',
  })
  @ApiParam({
    name: 'id',
    description:
      'ID bản ghi trong bảng assignment_ballot ',
    type: String,
    example: 'b8c9f43e-90b4-4c71-9d81-56c439c57960',
  })
  @Put(':id/approve')
  @ApiOperation({
    summary: 'Phê duyệt phiếu giao việc sửa chữa khi đã ủy quyền',
  })
  @Permissions('ASB.CONFIRM')
  async approve(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<AssignmentBallotApprovalListItemDto>> {
    try {
      const data = await this.assignmentBallotService.approve(id, user.id);
      return ApiResponseHelper.success(data, 'Phê duyệt thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/reject')
  @ApiOperation({
    summary:
      'Phê duyệt phiếu giao việc sửa chữa (ID là ID bảng)',
  })
  @ApiParam({
    name: 'id',
    description:
      'ID bản ghi trong bảng assignment_ballot',
    type: String,
    example: 'b8c9f43e-90b4-4c71-9d81-56c439c57960',
  })
  @Put(':id/reject')
  @ApiOperation({ summary: 'Từ chối phiếu giao việc sửa chữa khi đã ủy quyền' })
  @Permissions('ASB.CONFIRM')
  async reject(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<AssignmentBallotApprovalListItemDto>> {
    try {
      const data = await this.assignmentBallotService.reject(id, user.id);
      return ApiResponseHelper.success(data, 'Từ chối thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Put(':id/delegate-for-deputy-foreman')
  // @ApiOperation({
  //   summary: 'Ủy quyền giao việc cho phó quản đốc (quản đốc/foreman -> PQĐ)',
  // })
  // @Permissions('ASB.AUTHORITY_FOR_DEPUTY_FOREMAN')
  // async delegateForDeputyForeman(
  //   @Param('id') id: string,
  //   @Body() dto: DelegateAssignmentBallotDto,
  //   @User() user: any,
  // ): Promise<ApiResponse<void>> {
  //   try {
  //     await this.assignmentBallotService.delegateForDeputyForeman(
  //       id,
  //       user.userId,
  //       dto,
  //     );
  //     return ApiResponseHelper.success(
  //       null,
  //       'Ủy quyền cho phó quản đốc thành công',
  //       ERROR_CODES.SUCCESS,
  //     );
  //   } catch (error) {
  //     return ApiResponseHelper.error(
  //       error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
  //       error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  // @Put(':id/delegate-for-operator')
  // @ApiOperation({
  //   summary:
  //     'Ủy quyền giao việc cho tổ trưởng/người vận hành (PQĐ hoặc quản đốc -> tổ trưởng/người vận hành)',
  // })
  // @Permissions('ASB.AUTHORITY_FOR_OPERATOR')
  // async delegateForOperator(
  //   @Param('id') id: string,
  //   @Body() dto: DelegateAssignmentBallotDto,
  //   @User() user: any,
  // ): Promise<ApiResponse<void>> {
  //   try {
  //     await this.assignmentBallotService.delegateForOperator(
  //       id,
  //       user.userId,
  //       dto,
  //     );
  //     return ApiResponseHelper.success(
  //       null,
  //       'Ủy quyền cho tổ trưởng/người vận hành thành công',
  //       ERROR_CODES.SUCCESS,
  //     );
  //   } catch (error) {
  //     return ApiResponseHelper.error(
  //       error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
  //       error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }
}
