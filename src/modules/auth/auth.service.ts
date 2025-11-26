import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import type Redis from 'ioredis';
import * as ms from 'ms';
import { StringValue } from 'ms';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { ApiResponseHelper } from 'src/common/interfaces/response/api-response.interface';
import { jwtConfig } from 'src/config/jwt.config';
import { RoleSystem, User } from 'src/entities';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RoleSystem)
    private readonly roleSystemRepository: Repository<RoleSystem>,
    private readonly jwtService: JwtService,
    @Inject('REDIS')
    private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  async validateUser(phone: string, password: string) {
    if (!phone) {
      throw new UnauthorizedException({
        errCode: ERROR_CODES.PHONE_EMPTY,
        message: ERROR_MESSAGES[ERROR_CODES.PHONE_EMPTY],
      });
    }
    if (!password) {
      throw new UnauthorizedException({
        errCode: ERROR_CODES.PASSWORD_EMPTY,
        message: ERROR_MESSAGES[ERROR_CODES.PASSWORD_EMPTY],
      });
    }
    const user = await this.userRepository.findOne({
      where: { phone: phone },
      withDeleted: true,
    } as any);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: 'Tài khoản không tồn tại',
      });
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException({
        errCode: ERROR_CODES.USER_INACTIVE,
        message: ERROR_MESSAGES[ERROR_CODES.USER_INACTIVE],
      });
    }
    const okPw = await bcrypt.compare(password, user.password);
    const okPhone = user.phone === phone;
    const ok = okPw && okPhone;
    if (!ok) {
      throw new UnauthorizedException({
        errCode: ERROR_CODES.WRONG_PASSWORD,
        message: ERROR_MESSAGES[ERROR_CODES.WRONG_PASSWORD],
      });
    }
    return user;
  }

  async login(phone: string, password: string) {
    const user = await this.validateUser(phone, password);
    let roleSystemName: string | undefined = undefined;
    if (user.role_system_id) {
      const role = await this.roleSystemRepository.findOne({
        where: { id: user.role_system_id as any },
      });
      roleSystemName = role?.name;
    }
    const payload = {
      sub: user.id,
      phone: user.phone,
      roleSystem: roleSystemName,
      status: user.status,
      position_id: user.position_id,
      firstname: user.firstname,
      lastname: user.lastname,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: jwtConfig.accessToken.secret,
      expiresIn: jwtConfig.accessToken.expiresIn,
    });
    const refreshTokenPayload = { sub: user.id };
    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: jwtConfig.refreshToken.secret,
      expiresIn: jwtConfig.refreshToken.expiresIn,
    });
    // Store refresh token in Redis by userId
    const redisKey = `refresh:${user.id}`;
    // Convert JWT expiresIn string to seconds for Redis EX parameter
    const expiresInSeconds = Math.floor(
      ms(jwtConfig.refreshToken.expiresIn as StringValue) / 1000,
    );
    await this.redis.set(redisKey, refreshToken, 'EX', expiresInSeconds);
    return {
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.accessToken.expiresIn,
      needChangePassword: !!user.isNeedChangePassword,
      sub: user.id,
      role_system_name: roleSystemName,
      firstname: user.firstname,
      lastname: user.lastname,
    };
  }
  async refresh(userId: string, refreshToken: string) {
    try {
      const redisKey = `refresh:${userId}`;
      const tokenInStore = await this.redis.get(redisKey);

      if (!tokenInStore || tokenInStore !== refreshToken) {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.INVALID_REFRESH_TOKEN],
          ERROR_CODES.INVALID_REFRESH_TOKEN,
        );
      }

      const user = await this.userRepository.findOne({
        where: { id: userId as any } as any,
      });

      if (!user) {
        return ApiResponseHelper.error(
          ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
          ERROR_CODES.RECORD_NOT_FOUND,
        );
      }

      const payload = {
        sub: user.id,
        phone: user.phone,
        firstname: user.firstname,
        lastname: user.lastname,
        roleSystem: await this.getRoleSystemName(user),
        status: user.status,
      };

      const newAccessToken = await this.jwtService.signAsync(payload, {
        secret: jwtConfig.accessToken.secret,
        expiresIn: jwtConfig.accessToken.expiresIn,
      });

      const newRefreshToken = await this.jwtService.signAsync(
        { sub: user.id },
        {
          secret: jwtConfig.refreshToken.secret,
          expiresIn: jwtConfig.refreshToken.expiresIn,
        },
      );

      await this.redis.set(
        redisKey,
        newRefreshToken,
        'EX',
        this.convertExpiresInToSeconds(jwtConfig.refreshToken.expiresIn),
      );

      return ApiResponseHelper.success(
        {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: jwtConfig.accessToken.expiresIn,
        },
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch {
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async logout(userId: string) {
    try {
      const redisKey = `refresh:${userId}`;
      await this.redis.del(redisKey);
      return ApiResponseHelper.success(
        { success: true },
        ERROR_MESSAGES[ERROR_CODES.SUCCESS],
        ERROR_CODES.SUCCESS,
      );
    } catch {
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR],
        ERROR_CODES.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId as any, deletedAt: null },
      relations: ['roleSystem'],
    });
    if (!user) throw new UnauthorizedException('User not found');
    let departmentInfo: any = null;
    let positionInfo: any = null;
    if (user.roleSystem?.name !== 'admin') {
      if (user.department_id) {
        const depRepo = this.dataSource.getRepository('Department');
        const department = await depRepo.findOne({
          where: { id: user.department_id },
        });
        if (department)
          departmentInfo = {
            id: department.id,
            name: department.name,
            code: department.code,
            description: department.description,
          };
      }
      if (user.position_id) {
        const posRepo = this.dataSource.getRepository('Position');
        const position = await posRepo.findOne({
          where: { id: user.position_id },
        });
        if (position)
          positionInfo = {
            id: position.id,
            name: position.name,
            description: position.description,
            code: position.code,
          };
      }
    }
    let roleSystemObj: any = null;
    if (user.roleSystem) {
      roleSystemObj = {
        id: user.roleSystem.id,
        name: user.roleSystem.name,
      };
    }
    return {
      id: user.id,
      code: user.code,
      lastname: user.lastname,
      firstname: user.firstname,
      phone: user.phone,
      card_number: user.card_number,
      department: departmentInfo,
      position: positionInfo,
      role_system: roleSystemObj,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async getRoleSystemName(user: User): Promise<string | undefined> {
    if (!user.role_system_id) return undefined;
    const role = await this.roleSystemRepository.findOne({
      where: { id: user.role_system_id as any },
    });
    return role?.name;
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId as any } as any,
    });

    if (!user) {
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
        ERROR_CODES.RECORD_NOT_FOUND,
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      return ApiResponseHelper.error(
        'Mật khẩu hiện tại không đúng',
        ERROR_CODES.WRONG_PASSWORD,
      );
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return ApiResponseHelper.error(
        ERROR_MESSAGES[ERROR_CODES.SAME_PASSWORD],
        ERROR_CODES.SAME_PASSWORD,
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isNeedChangePassword = false;
    await this.userRepository.save(user);

    return ApiResponseHelper.success(
      { success: true },
      ERROR_MESSAGES[ERROR_CODES.SUCCESS],
      ERROR_CODES.SUCCESS,
    );
  }

  private convertExpiresInToSeconds(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') return expiresIn;
    if (typeof expiresIn === 'string') {
      const milliseconds = ms(expiresIn as unknown as StringValue);
      if (!milliseconds || isNaN(milliseconds)) {
        throw new Error(`Invalid expiresIn format: ${expiresIn}`);
      }
      return Math.floor(milliseconds / 1000);
    }
    throw new Error(`Unsupported expiresIn type: ${typeof expiresIn}`);
  }
}
