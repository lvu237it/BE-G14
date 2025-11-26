import { SetMetadata } from '@nestjs/common';
import { RoleSystemName } from 'src/common/constants/roles_system';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleSystemName[]) =>
  SetMetadata(ROLES_KEY, roles);
