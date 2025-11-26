import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from 'src/entities/department.entity';
import {
  DepartmentListItemDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentItemDto,
} from 'src/common/interfaces/dto/department.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) { }

  /**
   * Lấy danh sách phòng ban (phân trang)
   */
  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): Promise<PaginatedResponse<DepartmentListItemDto>> {
    const query = this.departmentRepository.createQueryBuilder('department');

    // Tìm kiếm theo code hoặc name
    if (search) {
      query.andWhere(
        '(LOWER(department.code) LIKE :search OR LOWER(department.name) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    query.orderBy('department.name', sortOrder);

    // Phân trang
    query.skip((page - 1) * limit).take(limit);

    const [departments, total] = await query.getManyAndCount();

    return {
      items: departments.map((d) => this.toDto(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }



  /**
   * Lấy chi tiết phòng ban theo ID
   */
  async findOne(id: string): Promise<DepartmentListItemDto> {
    const department = await this.departmentRepository.findOne({
      where: { id: id as any },
    });

    if (!department)
      throw new NotFoundException({
        errCode: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
      });

    return this.toDto(department);
  }

  /**
   * Tạo mới phòng ban
   */
  async create(dto: CreateDepartmentDto): Promise<DepartmentListItemDto> {
  // Nếu parent_id là chuỗi rỗng thì set về null
  if (!dto.parent_id || dto.parent_id.trim() === '') {
    dto.parent_id = null;
  }

  // Kiểm tra code trùng
  const existCode = await this.departmentRepository
    .createQueryBuilder('department')
    .where('LOWER(department.code) = LOWER(:code)', { code: dto.code })
    .getOne();

  if (existCode)
    throw new BadRequestException({
      errCode: ERROR_CODES.DEPARTMENT_CODE_EXISTS,
      message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_CODE_EXISTS],
    });

  // Kiểm tra tên trùng (toàn cục hoặc trong cùng cha)
  let query = this.departmentRepository
    .createQueryBuilder('department')
    .where('LOWER(department.name) = LOWER(:name)', { name: dto.name });

  if (dto.parent_id) {
    query = query.andWhere('department.parent_id = :parentId', {
      parentId: dto.parent_id,
    });
  } else {
    query = query.andWhere('department.parent_id IS NULL');
  }

  const existName = await query.getOne();
  if (existName)
    throw new BadRequestException({
      errCode: ERROR_CODES.DEPARTMENT_NAME_EXISTS,
      message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NAME_EXISTS],
    });

  // Nếu có parent_id thì kiểm tra parent có tồn tại
  let parent: Department = null;
  if (dto.parent_id) {
    parent = await this.departmentRepository.findOne({
      where: { id: dto.parent_id },
    });

    if (!parent)
      throw new BadRequestException({
        errCode: ERROR_CODES.DEPARTMENT_PARENT_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_PARENT_NOT_FOUND],
      });
  }

  // Tạo mới department
  const department = this.departmentRepository.create({
    ...dto,
    parent: parent || null,
  });

  const saved = await this.departmentRepository.save(department);
  return this.toDto(saved);
}



  /**
   * Cập nhật phòng ban
   */
  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentListItemDto> {
  const department = await this.departmentRepository.findOne({
    where: { id: id as any },
  });

  if (!department) {
    throw new NotFoundException({
      errCode: ERROR_CODES.DEPARTMENT_NOT_FOUND,
      message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
    });
  }

  // 🔹 Nếu parent_id là chuỗi rỗng hoặc không truyền thì set null
  if (!dto.parent_id || dto.parent_id.trim() === '') {
    dto.parent_id = null;
  }

  // 🔹 Không cho parent_id = chính id của phòng ban
  if (dto.parent_id && dto.parent_id === department.id) {
    throw new BadRequestException({
      errCode: ERROR_CODES.DEPARTMENT_INVALID_PARENT,
      message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_INVALID_PARENT],
    });
  }

  // 🔹 Kiểm tra parent_id có tồn tại không (nếu có truyền)
  let parent: Department = null;
  if (dto.parent_id) {
    parent = await this.departmentRepository.findOne({
      where: { id: dto.parent_id },
    });

    if (!parent) {
      throw new BadRequestException({
        errCode: ERROR_CODES.DEPARTMENT_PARENT_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_PARENT_NOT_FOUND],
      });
    }
     if (dto.name && dto.name.trim().toLowerCase() === parent.name.trim().toLowerCase()) {
      throw new BadRequestException({
        errCode: ERROR_CODES.DEPARTMENT_CODE_EXISTS,
        message: 'Tên phòng ban không được trùng với tên của phòng ban cha.',
      });
    }
  }
 

  // 🔹 Kiểm tra code trùng (nếu có thay đổi)
  if (dto.code && dto.code.toLowerCase() !== department.code.toLowerCase()) {
    const existCode = await this.departmentRepository
      .createQueryBuilder('department')
      .where('LOWER(department.code) = LOWER(:code)', { code: dto.code })
      .andWhere('department.id != :id', { id })
      .getOne();

    if (existCode) {
      throw new BadRequestException({
        errCode: ERROR_CODES.DEPARTMENT_CODE_EXISTS,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_CODE_EXISTS],
      });
    }
  }

  // 🔹 Kiểm tra name trùng (trong cùng cấp cha)
  if (dto.name && dto.name.toLowerCase() !== department.name.toLowerCase()) {
    let query = this.departmentRepository
      .createQueryBuilder('department')
      .where('LOWER(department.name) = LOWER(:name)', { name: dto.name })
      .andWhere('department.id != :id', { id });

    if (dto.parent_id) {
      query = query.andWhere('department.parent_id = :parentId', { parentId: dto.parent_id });
    } else {
      query = query.andWhere('department.parent_id IS NULL');
    }

    const existName = await query.getOne();
    if (existName) {
      throw new BadRequestException({
        errCode: ERROR_CODES.DEPARTMENT_NAME_EXISTS,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NAME_EXISTS],
      });
    }
  }

  // 🔹 Cập nhật dữ liệu
  Object.assign(department, {
    ...dto,
    parent: parent || null,
  });

  const updated = await this.departmentRepository.save(department);
  return this.toDto(updated);
}


  /**
   * Xoá phòng ban
   */
  async delete(id: string): Promise<void> {
    const result = await this.departmentRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException({
        errCode: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
      });
  }

  async getAllForAddEquipment(): Promise<DepartmentItemDto[]> {
    const result = await this.departmentRepository.find({})
    if (!result) {
      throw new NotFoundException({
        errCode: ERROR_CODES.DEPARTMENT_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.DEPARTMENT_NOT_FOUND],
      });
    }

    return result.map((e) => ({
      id: e.id,
      name: e.name
    }))

  }

  /**
   * Map entity → DTO
   */
  private toDto(d: Department): DepartmentListItemDto {
    return {
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }

  private toItemDto(d: Department): DepartmentItemDto {
    return {
      id: d.id,
      name: d.name
    };
  }
}
