import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Position } from 'src/entities/position.entity';
import { Department } from 'src/entities/department.entity';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionListItemDto,
  PositionItemDto,
} from 'src/common/interfaces/dto/position.dto';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { Permission } from 'src/entities/permission.entity';
import { User } from 'src/entities/user.entity';
import { PositionPermission } from 'src/entities/position-permission.entity';
import { RoleSystem } from 'src/entities';

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(RoleSystem)
    private readonly roleSystemRepo: Repository<RoleSystem>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
    @InjectRepository(PositionPermission)
    private readonly positionPermissionRepo: Repository<PositionPermission>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  /**
   * Convert entity -> DTO
   */
  private toDto(position: Position): PositionListItemDto {
    return {
      id: position.id,
      name: position.name,
      description: position.description,
      code:position.code,
      departmentName: position.department?.name ?? '',
    };
  }

   private toDtoItem(position: Position): PositionItemDto {
    return {
      id: position.id,
      name: position.name,
      description: position.description,
      code:position.code,
      departmentId: position.department?.id ?? '',
    };
  }

  /**
   * Get all positions
   */
    async findAll(
    page = 1,
    limit = 20,
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    departmentId?: string,
  ): Promise<{
    items: PositionListItemDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const query = this.positionRepo
        .createQueryBuilder('position')
        .leftJoinAndSelect('position.department', 'department')
       
      // 🔍 Tìm kiếm theo tên hoặc mô tả
      if (search) {
        query.andWhere(
          '(LOWER(position.name) LIKE :search OR LOWER(position.description) LIKE :search)',
          { search: `%${search.toLowerCase()}%` },
        );
      }

      // Lọc theo departmentId
      if (departmentId) {
        query.andWhere('department.id = :departmentId', { departmentId });
      }
      //Sắp xếp
      query.orderBy(`position.name`, sortOrder);

      // Phân trang
      query.skip((page - 1) * limit).take(limit);

      const [positions, total] = await query.getManyAndCount();

      return {
        items: positions.map((p) => this.toDto(p)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new HttpException(
        {
          code: ERROR_CODES.DATABASE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  /**
   * Get single position by id
   */
  async findOne(id: string): Promise<PositionItemDto> {
  const position = await this.positionRepo
    .createQueryBuilder('position')
    .leftJoin('position.department', 'department')
    .addSelect(['department.id']) 
    .where('position.id = :id', { id }) 
    .getOne();

  if (!position) {
    throw new HttpException(
      {
        code: ERROR_CODES.POSITION_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.POSITION_NOT_FOUND],
      },
      HttpStatus.NOT_FOUND,
    );
  }

  return {
    id: position.id,
    name: position.name,
    description: position.description,
    code:position.code,
    departmentId: position.department?.id || null,
  };
}


  /**
   * Create new position
   */
  async create(dto: CreatePositionDto): Promise<PositionListItemDto> {
    const department = await this.departmentRepo.findOne({
      where: { id: dto.departmentId },
    });
    if (dto.name =='')
      {
      throw new HttpException(
        {
          code: ERROR_CODES.POSITION_VALIDATE_NAME,
          message: ERROR_MESSAGES[ERROR_CODES.POSITION_VALIDATE_NAME],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.code =='')
      {
      throw new HttpException(
        {
          code: ERROR_CODES.POSITION_VALIDATE_CODE,
          message: ERROR_MESSAGES[ERROR_CODES.POSITION_VALIDATE_CODE],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!department) {
      throw new HttpException(
        {
          code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
          message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // check duplicate name in same department
    const exists = await this.positionRepo
  .createQueryBuilder('position')
  .leftJoinAndSelect('position.department', 'department')
  .where('LOWER(position.name) = LOWER(:name)', { name: dto.name })
  .andWhere('department.id = :departmentId', { departmentId: dto.departmentId })
  .getOne();

if (exists) {
  throw new HttpException(
    {
      code: ERROR_CODES.POSITION_DUPLICATE_RECORD,
      message: ERROR_MESSAGES[ERROR_CODES.POSITION_DUPLICATE_RECORD],
    },
    HttpStatus.CONFLICT,
  );
}

    try {
      const position = this.positionRepo.create({
        name: dto.name,
        description: dto.description,
        code:dto.code,
        department,
      });

      const saved = await this.positionRepo.save(position);
      const reloaded = await this.positionRepo.findOne({
        where: { id: saved.id },
        relations: ['department'],
      });

      return this.toDto(reloaded);
    } catch (error) {
      throw new HttpException(
        {
          code: ERROR_CODES.DATABASE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update position
   */
  async update(id: string, dto: UpdatePositionDto): Promise<PositionListItemDto> {
    const position = await this.positionRepo.findOne({
      where: { id },
      relations: ['department'],
    });

    if (!position) {
      throw new HttpException(
        {
          code: ERROR_CODES.RECORD_NOT_FOUND,
          message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
        },
        HttpStatus.NOT_FOUND,
      );
    }
      if (dto.name =='')
      {
      throw new HttpException(
        {
          code: ERROR_CODES.POSITION_VALIDATE_NAME,
          message: ERROR_MESSAGES[ERROR_CODES.POSITION_VALIDATE_NAME],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
     // check duplicate name in same department
   // check duplicate name in same department, only if name has changed
if (
  dto.name &&
  dto.name.toLowerCase() !== position.name.toLowerCase()
) {
  const exists = await this.positionRepo
    .createQueryBuilder('position')
    .leftJoin('position.department', 'department')
    .where('LOWER(position.name) = LOWER(:name)', { name: dto.name })
    .andWhere('department.id = :departmentId', { departmentId: dto.departmentId })
    .andWhere('position.id != :id', { id })
    .getOne();
  if (exists) {
    throw new BadRequestException(
      {
        code: ERROR_CODES.POSITION_DUPLICATE_RECORD,
        message: ERROR_MESSAGES[ERROR_CODES.POSITION_DUPLICATE_RECORD],
      },
    );
  }
}

    
    if (dto.departmentId) {
      const department = await this.departmentRepo.findOne({
        where: { id: dto.departmentId },
      });
      if (!department) {
        throw new HttpException(
          {
            code: ERROR_CODES.DEPARTMENT_NOT_FOUND,
            message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      position.department = department;
    }

    Object.assign(position, dto);

    try {
      const updated = await this.positionRepo.save(position);
      const reloaded = await this.positionRepo.findOne({
        where: { id: updated.id },
        relations: ['department'],
      });
      return this.toDto(reloaded);
    } catch (error) {
      throw new HttpException(
        {
          code: ERROR_CODES.DATABASE_ERROR,
          message: ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete position
   */
   async delete(id: string): Promise<void> {
  const position = await this.positionRepo.findOne({
    where: { id },
  });

  if (!position) {
    throw new HttpException(
      {
        code: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      },
      HttpStatus.NOT_FOUND,
    );
  }

  await this.userRepo.update(
    { position_id: id },
    { position_id: null },
  );

  await this.positionPermissionRepo.delete({
  position: { id: id },
});


  try {
    await this.positionRepo.delete(id);
  } catch {
    throw new HttpException(
      {
        code: ERROR_CODES.DATABASE_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.DATABASE_ERROR],
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

async findOneWithPermissions(positionId: string): Promise<Position> {
  const position = await this.positionRepo
    .createQueryBuilder('position')
    .leftJoin('position.department', 'department')
    .leftJoin('position.permissions', 'positionPermission') 
    .leftJoin('positionPermission.permission', 'permission') 
    .select([
      'position.id',
      'position.name',
      'position.description',
      'department.id',
      'department.name',
      'positionPermission.id', 
      'permission.id',
      'permission.code',
    ])
    .where('position.id = :positionId', { positionId })
    .getOne();

  if (!position) {
    throw new NotFoundException('Position not found');
  }

  return position;
}

async findPositionByDepartment(departmentId: string): Promise<Position[]> {
  const position = await this.positionRepo
    .createQueryBuilder('position')
    .leftJoin('position.department', 'department')
    .select([
      'position.id',
      'position.name',
      'position.description'
    ])
    .where('position.department.id = :departmentId', { departmentId })
    .getMany();
  if (!position) {
    throw new NotFoundException('Position not found');
  }

  return position;
}



async assignPermissions(
  context: any,
  positionId: string,
  permissionIds: string[],
) {
  const { user } = context;
  const userId = user.userId;
  const userFromDb = await this.userRepo.findOne({
    where: { id: userId },
    relations: ['roleSystem'],
  });
  if (!userFromDb) throw new NotFoundException('User not found');
  if (userFromDb.roleSystem?.name !== 'ADMIN') {
    throw new ForbiddenException('Chỉ ADMIN mới được phân quyền');
  }

  const position = await this.positionRepo.findOne({
    where: { id: positionId },
  });
  if (!position) throw new NotFoundException('Chức danh không tồn tại');

  const existingMappings = await this.positionPermissionRepo.find({
    where: { position: { id: positionId } },
    relations: ['permission'],
  });
  const existingPermissionIds = existingMappings.map((m) => m.permission.id);

  const basePermissions = await this.permissionRepo.findByIds(permissionIds);
  if (!basePermissions.length && permissionIds.length > 0) {
    throw new NotFoundException('Không tìm thấy quyền nào hợp lệ');
  }

  const subPermissions: any[] = [];
  for (const perm of basePermissions) {
    if (!perm.code.includes('.')) {
      const children = await this.permissionRepo.find({
        where: { code: Like(`${perm.code}.%`) },
      });
      if (children.length > 0) subPermissions.push(...children);
    }
  }

  const allPermissionsMap = new Map<string, any>();
  [...basePermissions, ...subPermissions].forEach((p) =>
    allPermissionsMap.set(p.id, p),
  );
  const allPermissions = Array.from(allPermissionsMap.values());
  const newPermissionIds = allPermissions.map((p) => p.id);

  const toAdd = newPermissionIds.filter((id) => !existingPermissionIds.includes(id));
  const toRemove = existingPermissionIds.filter((id) => !newPermissionIds.includes(id));

  if (toRemove.length > 0) {
    await this.positionPermissionRepo.delete({
      position: { id: positionId },
      permission: In(toRemove),
    });
  }

  if (toAdd.length > 0) {
    const addPermissions = await this.permissionRepo.findByIds(toAdd);
    const mappings = addPermissions.map((p) => {
      const pp = new PositionPermission();
      pp.position = position;
      pp.permission = p;
      return pp;
    });
    await this.positionPermissionRepo.save(mappings);
  }

  return {
    message: 'Cập nhật quyền cho chức danh thành công',
    added: toAdd.length,
    removed: toRemove.length,
    total: newPermissionIds.length,
  };
}



}
