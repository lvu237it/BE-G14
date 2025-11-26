import {
  Controller,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import {
  ApiResponse,
  ApiResponseHelper,
} from 'src/common/interfaces/response/api-response.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../permission/guards/permissions.guard';
import { Permissions } from '../permission/decorators/permissions.decorator';
import { TechnicalAppraisalBallotService } from './technical-appraisal-ballot.service';
import { TechnicalAppraisalBallotViewDto } from 'src/common/interfaces/dto/technical-appraisal-ballot.dto';
import { User as UserDecorator } from 'src/common/decorators/user.decorator';

@ApiTags('Biên bản giám định kỹ thuật (01/SCTX)')
@ApiBearerAuth('JWT-auth')
@Controller('technical-appraisal-ballots')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class TechnicalAppraisalBallotController {
  constructor(
    private readonly technicalAppraisalBallotService: TechnicalAppraisalBallotService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Xem biên bản giám định kỹ thuật (01/SCTX)' })
  @ApiParam({ name: 'id', description: 'ID biên bản giám định kỹ thuật' })
  @Permissions('TAB.VIEW')
  async getTechnicalAppraisalBallot(
    @Param('id') id: string,
  ): Promise<ApiResponse<TechnicalAppraisalBallotViewDto>> {
    try {
      const data = await this.technicalAppraisalBallotService.findOne(id);
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
  @ApiOperation({
    summary: 'Ký biên bản giám định kỹ thuật (01/SCTX) - backend tự xác định trường nào phù hợp để ký cho user',
  })
  @ApiParam({ name: 'id', description: 'ID biên bản giám định kỹ thuật' })
  @Permissions('TAB.SIGN')
  async sign(
    @Param('id') id: string,
    @UserDecorator() user: any,
  ): Promise<ApiResponse<TechnicalAppraisalBallotViewDto>> {
    try {
      const data = await this.technicalAppraisalBallotService.sign(id, user);
      return ApiResponseHelper.success(data, 'Ký thành công');
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

