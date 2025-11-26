import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission } from 'src/entities/permission.entity';
import { User } from 'src/entities/user.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { PermissionListItemDto } from 'src/common/interfaces/dto/permission.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(PositionPermission)
    private readonly positionPermissionRepo: Repository<PositionPermission>,
  ) {}

  async createPermissionsIfNotExist(
    permissions: { code: string; description?: string }[],
  ) {
    if (!permissions || permissions.length === 0) return;

    const names = permissions.map((p) => p.code);
    const existing = await this.permissionRepo.find({
      where: { code: In(names) },
    });
    const existingNames = new Set(existing.map((e) => e.code));

    const toInsert = permissions.filter((p) => !existingNames.has(p.code));
    if (toInsert.length === 0) return;

    // Save new permissions
    await this.permissionRepo.save(toInsert);
  }

  async findAll(search?: string): Promise<PermissionListItemDto[]> {
    const query = this.permissionRepo.createQueryBuilder('permission');
    if (search) {
      query.andWhere(
  'LOWER(permission.code) LIKE :search',
  { search: `%${search.toLowerCase()}%`},
);

    }
    const permissions =await query.getMany();
    return permissions.map((d) => this.toDto(d))
  }

  async findBySystemNames(names: string[]) {
    return this.permissionRepo.find({ where: { code: In(names) } });
  }

  async findByIds(ids: string[]) {
    if (!ids || ids.length === 0) return [];
    return this.permissionRepo.find({ where: { id: In(ids) } });
  }

  async getPermissionsByUserId(userId: string): Promise<string[]> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['position'],
    });

    if (!user || !user.position_id) {
      return [];
    }

    const positionPermissions = await this.positionPermissionRepo.find({
      where: { position: { id: user.position_id } },
      relations: ['permission'],
    });

    return positionPermissions.map((pp) => pp.permission.code);
  }
  private toDto(p: Permission): PermissionListItemDto {
      return {
        id: p.id,
        code: p.code,
        description: p.description,

      };
    }
}
