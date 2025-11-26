import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { User } from 'src/entities/user.entity';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(PositionPermission)
    private readonly positionPermissionRepo: Repository<PositionPermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest() as { user: User };
    if (!user) {
      throw new ForbiddenException({
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
      });
    }

    if (!user.position_id) {
      throw new ForbiddenException({
        code: ERROR_CODES.FORBIDDEN,
        message: 'Bạn chưa được gán chức vụ, không có quyền truy cập.',
      });
    }

    // 🔹 Lấy quyền theo chức vụ
    const userPermissions = await this.positionPermissionRepo.find({
      where: { position: { id: user.position_id } },
      relations: ['permission'],
    });

    if (!userPermissions || userPermissions.length === 0) {
      throw new ForbiddenException({
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: ERROR_MESSAGES[ERROR_CODES.INSUFFICIENT_PERMISSIONS],
      });
    }

    const userPermissionNames = userPermissions.map((p) => p.permission.code);

    const hasPermission = requiredPermissions.every((p) =>
      userPermissionNames.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException({
        code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        message: ERROR_MESSAGES[ERROR_CODES.INSUFFICIENT_PERMISSIONS],
        missing: requiredPermissions.filter(
          (p) => !userPermissionNames.includes(p),
        ),
      });
    }

    return true;
  }
}
