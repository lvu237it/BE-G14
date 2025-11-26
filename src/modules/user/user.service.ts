import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities';
import {
  UserListItemDto,
  CreateUserDto,
  UpdateUserDto,
} from 'src/common/interfaces/dto/user.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import * as bcrypt from 'bcryptjs';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    position_id?: string,
    department_id?: string,
    sortBy: 'firstname' | 'lastname' | 'createdAt' = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<PaginatedResponse<UserListItemDto>> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleSystem', 'roleSystem')
      .andWhere('(roleSystem.name IS NULL OR roleSystem.name != :adminRole)', {
        adminRole: 'ADMIN',
      })
      .andWhere('user.status IN (:...statuses)', {
        statuses: ['active', 'inactive', 'deleted'],
      });
    if (position_id) {
      qb.andWhere('user.position_id = :position_id', { position_id });
    }
    if (department_id) {
      qb.andWhere('user.department_id = :department_id', { department_id });
    }
    const validSortFields = ['firstname', 'lastname', 'createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    qb.orderBy(`user.${field}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);
    qb.withDeleted();
    const [users, total] = await qb.getManyAndCount();
    return {
      items: await Promise.all(users.map(async (u) => this.toDto(u))),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserListItemDto> {
    const user = await this.userRepository.findOne({
      where: { id: id as any, deletedAt: null },
      relations: ['roleSystem'],
    });

    if (!user)
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });

    return this.toDto(user);
  }

  async create(dto: CreateUserDto): Promise<UserListItemDto> {
    const existPhone = await this.userRepository.findOne({
      where: { phone: dto.phone },
    });
    if (existPhone)
      throw new BadRequestException({
        errCode: ERROR_CODES.USER_PHONE_EXISTS,
        message: ERROR_MESSAGES[ERROR_CODES.USER_PHONE_EXISTS],
      });

    const existCode = await this.userRepository.findOne({
      where: { code: dto.code },
    });
    if (existCode)
      throw new BadRequestException({
        errCode: ERROR_CODES.USER_CODE_EXISTS,
        message: ERROR_MESSAGES[ERROR_CODES.USER_CODE_EXISTS],
      });

    const existCardNumber = await this.userRepository.findOne({
      where: { card_number: dto.card_number },
    });
    if (existCardNumber)
      throw new BadRequestException({
        errCode: ERROR_CODES.USER_CARD_NUMBER_EXISTS,
        message: ERROR_MESSAGES[ERROR_CODES.USER_CARD_NUMBER_EXISTS],
      });

    const user = this.userRepository.create({
      ...dto,
      password: await bcrypt.hash(dto.password, 10),
      status: dto.status || 'active',
    });

    const saved = await this.userRepository.save(user);
    return this.toDto(saved);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserListItemDto> {
    const user = await this.userRepository.findOne({
      where: { id: id as any },
    });
    if (!user)
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });

    if (dto.phone && dto.phone !== user.phone) {
      const existPhone = await this.userRepository.findOne({
        where: { phone: dto.phone },
      });
      if (existPhone)
        throw new BadRequestException({
          errCode: ERROR_CODES.USER_PHONE_EXISTS,
          message: ERROR_MESSAGES[ERROR_CODES.USER_PHONE_EXISTS],
        });
    }

    if (dto.card_number && dto.card_number !== user.card_number) {
      const existCardNumber = await this.userRepository.findOne({
        where: { card_number: dto.card_number },
      });
      if (existCardNumber)
        throw new BadRequestException({
          errCode: ERROR_CODES.USER_CARD_NUMBER_EXISTS,
          message: ERROR_MESSAGES[ERROR_CODES.USER_CARD_NUMBER_EXISTS],
        });
    }

    if (dto.code && dto.code !== user.code) {
      const existCode = await this.userRepository.findOne({
        where: { code: dto.code },
      });
      if (existCode)
        throw new BadRequestException({
          errCode: ERROR_CODES.USER_CODE_EXISTS,
          message: ERROR_MESSAGES[ERROR_CODES.USER_CODE_EXISTS],
        });
    }

    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);

    // Không cho update status qua API update user thường nữa
    const { status, ...dtoWithoutStatus } = dto as any;
    Object.assign(user, dtoWithoutStatus);
    const updated = await this.userRepository.save(user);
    return this.toDto(updated);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: id as any },
    });
    if (!user)
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });
    user.status = 'deleted';
    await this.userRepository.save(user);
    await this.userRepository.softDelete(id);
  }

  async updateStatus(id: string, status: 'active' | 'inactive') {
    const user = await this.userRepository.findOne({
      where: { id: id as any },
    });
    if (!user)
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });
    user.status = status;
    await this.userRepository.save(user);
    return this.toDto(user);
  }
  async resetPasswordByAdmin(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });
    }
    if (!newPassword) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Mật khẩu mới không được để trống!',
      });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.isNeedChangePassword = true;
    await this.userRepository.save(user);
  }

  async restoreUser(id: string): Promise<UserListItemDto> {
    const deletedUser = await this.userRepository.findOne({
      where: { id: id as any },
      withDeleted: true,
    });
    if (!deletedUser || !deletedUser.deletedAt) {
      throw new NotFoundException({
        errCode: ERROR_CODES.USER_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND],
      });
    }
    await this.userRepository.restore(id);
    deletedUser.status = 'active';
    deletedUser.deletedAt = null;
    await this.userRepository.save(deletedUser);
    return this.toDto(deletedUser);
  }

  private async toDto(u: User): Promise<any> {
    // Import repository nếu chưa có
    const departmentRepo =
      this.userRepository.manager.getRepository('Department');
    const positionRepo = this.userRepository.manager.getRepository('Position');
    let departmentObj: any = null;
    let positionObj: any = null;
    let roleSystemObj: any = null;
    // roleSystem dạng object
    if (u.roleSystem) {
      roleSystemObj = {
        id: u.roleSystem.id,
        name: u.roleSystem.name,
      };
    }
    // department, position (không phải admin thì trả obj)
    if (u.roleSystem?.name !== 'admin') {
      if (u.department_id) {
        const dep = await departmentRepo.findOne({
          where: { id: u.department_id },
        });
        if (dep)
          departmentObj = {
            id: dep.id,
            name: dep.name,
            code: dep.code,
            description: dep.description,
          };
      }
      if (u.position_id) {
        const pos = await positionRepo.findOne({
          where: { id: u.position_id },
        });
        if (pos)
          positionObj = {
            id: pos.id,
            name: pos.name,
            description: pos.description,
          };
      }
    }
    return {
      id: u.id,
      code: u.code,
      lastname: u.lastname,
      firstname: u.firstname,
      phone: u.phone,
      password: '',
      card_number: u.card_number,
      department: departmentObj,
      position: positionObj,
      role_system: roleSystemObj,
      status: u.status,
      createdAt: (u as any)?.createdAt ?? null,
      updatedAt: (u as any)?.updatedAt ?? null,
    };
  }
}
