import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleSystemName } from 'src/common/constants/roles_system';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleSystemName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    // Nếu không có user => chưa đăng nhập
    if (!user) {
      throw new ForbiddenException({
        errCode: ERROR_CODES.UNAUTHORIZED,
        reason: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
        result: 'ERROR',
      });
    }

    const userRoleSystem = user.roleSystem as RoleSystemName | undefined;

    // Admin có toàn quyền
    if (userRoleSystem === RoleSystemName.ADMIN) return true;

    // Nếu user không có quyền
    if (!requiredRoles.includes(userRoleSystem)) {
      throw new ForbiddenException({
        errCode: ERROR_CODES.FORBIDDEN,
        reason: ERROR_MESSAGES[ERROR_CODES.FORBIDDEN],
        result: 'ERROR',
      });
    }

    return true;
  }
}
