import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { User as UserDecorator } from 'src/common/decorators/user.decorator';
import {
  SettlementRepairBallotListItemDto,
  SettlementRepairBallotUpdateItemsDto,
} from 'src/common/interfaces/dto/settlement-repair-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { SettlementRepairBallotService } from './settlement-repair-ballot.service';
@ApiTags('Settlement Repair Ballot')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('settlement-repair-ballots')
export class SettlementRepairBallotController {
  constructor(private readonly srbService: SettlementRepairBallotService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách phiếu thanh lý sửa chữa' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'equipment_id', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Permissions('SRB.VIEW')
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query() filters?: any,
  ): Promise<PaginatedResponse<SettlementRepairBallotListItemDto>> {
    return this.srbService.findAll(+page, +limit, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết phiếu thanh lý sửa chữa' })
  @ApiParam({ name: 'id', description: 'ID phiếu' })
  @Permissions('SRB.VIEW')
  async findOne(
    @Param('id') id: string,
  ): Promise<SettlementRepairBallotListItemDto> {
    return this.srbService.findOne(id);
  }

  @Patch(':id/items')
  @ApiOperation({ summary: 'Cập nhật vật tư và nhân công phiếu' })
  @ApiParam({ name: 'id', description: 'ID phiếu' })
  @ApiBody({ type: SettlementRepairBallotUpdateItemsDto })
  @Permissions('SRB.CREATE')
  async updateItems(
    @Param('id') id: string,
    @Body() dto: SettlementRepairBallotUpdateItemsDto,
    @UserDecorator() user: any,
  ): Promise<SettlementRepairBallotListItemDto> {
    return this.srbService.updateItems(id, dto, user);
  }

  @Patch(':id/sign')
  @ApiOperation({ summary: 'Ký phiếu thanh lý sửa chữa' })
  @ApiParam({ name: 'id', description: 'ID phiếu' })
  @Permissions('SRB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<SettlementRepairBallotListItemDto> {
    return this.srbService.sign(id, user);
  }
}
