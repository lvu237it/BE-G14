import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { ChangePasswordDto } from 'src/common/interfaces/dto/auth/change-password.dto';
import { LoginDto } from 'src/common/interfaces/dto/auth/login.dto';
import { RefreshTokenDto } from 'src/common/interfaces/dto/auth/refresh-token.dto';
import {
  ApiResponse,
  ApiResponseHelper,
} from 'src/common/interfaces/response/api-response.interface';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Response } from 'express';

@ApiTags('Xác thực')
@ApiBearerAuth('JWT-auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<any>> {
    try {
      if (!body.phone) {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.PHONE_EMPTY],
          ERROR_CODES.PHONE_EMPTY,
        );
      }
      if (!body.password) {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.PASSWORD_EMPTY],
          ERROR_CODES.PASSWORD_EMPTY,
        );
      }
      const data = await this.authService.login(body.phone, body.password);
      if (data && data.accessToken) {
        res.cookie('accessToken', data.accessToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge:
            parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '7d') *
            24 *
            60 *
            60 *
            1000,
          path: '/',
        });
        // Xóa token khỏi response body
        delete data.accessToken;
        delete data.refreshToken;
        delete data.expiresIn;
      }
      return ApiResponseHelper.success(
        data,
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch (error) {
      // Nếu bắt được UnauthorizedException các service throw ra, đổi về tiếng Việt nếu cần
      const detail = error.response?.message || error.message;
      let errCode = error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
      let vietReason = detail;
      if (detail && detail.includes('should not be empty')) {
        if (detail.includes('phone')) {
          vietReason = ERROR_MESSAGES[ERROR_CODES.PHONE_EMPTY];
          errCode = ERROR_CODES.PHONE_EMPTY;
        }
        if (detail.includes('password')) {
          vietReason = ERROR_MESSAGES[ERROR_CODES.PASSWORD_EMPTY];
          errCode = ERROR_CODES.PASSWORD_EMPTY;
        }
      }
      return ApiResponseHelper.error(
        vietReason || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        errCode,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy thông tin người dùng từ access token' })
  @Get('me')
  async me(@Req() req: any): Promise<ApiResponse<any>> {
    try {
      const userId = req.user.userId;
      const userProfile = await this.authService.getProfile(userId);
      return ApiResponseHelper.success(
        userProfile,
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ApiBody({ type: ChangePasswordDto })
  @Post('change-password')
  async changePassword(
    @Req() req: any,
    @Body() body: ChangePasswordDto,
  ): Promise<ApiResponse<any>> {
    try {
      const result = await this.authService.changePassword(
        req.user.userId,
        body.currentPassword,
        body.newPassword,
      );

      return result;
    } catch (error) {
      return ApiResponseHelper.error(
        error.message || ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        error.errCode || ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Đăng xuất' })
  @Post('logout')
  async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<any>> {
    try {
      res.clearCookie('accessToken', { path: '/' });
      const data = await this.authService.logout(req.user?.userId);
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh-token')
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  async refreshToken(
    @Body() body: RefreshTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ApiResponse<any>> {
    try {
      let refreshToken = req.cookies?.refresh_token || body.refreshToken;
      if (!refreshToken) {
        return ApiResponseHelper.error(
          'Thiếu refresh token',
          ERROR_CODES.INVALID_REFRESH_TOKEN,
        );
      }
      const decoded: any = this.safeDecode(refreshToken);
      const resp = await this.authService.refresh(decoded?.sub, refreshToken);
      if (resp.result !== 'SUCCESS') {
        return resp;
      }
      if (resp.data?.refreshToken) {
        res.cookie('refresh_token', resp.data.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'lax',
          maxAge:
            parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d') *
            24 *
            60 *
            60 *
            1000,
          path: '/',
        });
        delete resp.data.refreshToken;
        delete resp.data.accessToken;
        delete resp.data.expiresIn;
      }
      return ApiResponseHelper.success(
        resp.data,
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

  private safeDecode(token: string): any {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
      );
      return payload;
    } catch {
      return undefined;
    }
  }
}
