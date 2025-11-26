import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from 'src/entities/equipment.entity';
import { LocationEquipment } from 'src/entities/location-equipment.entity';
import {
  LocationEquipmentDto,
  CreateLocationEquipmentDto,
  UpdateLocationEquipmentDto,
} from 'src/common/interfaces/dto/location-equipment.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class LocationEquipmentService {
  constructor(
    @InjectRepository(LocationEquipment)
    private readonly repo: Repository<LocationEquipment>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    sortBy: 'code' | 'name' | 'createdAt' = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<PaginatedResponse<LocationEquipmentDto>> {
    const validSortFields = ['code','name','createdAt'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order: any = {};
    order[field] = sortOrder;
    if (field !== 'createdAt') order['createdAt'] = 'DESC';
    const [items, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order,
    });
    return {
      items: items.map((t) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        description: t.description,
        createdAt: (t as any)?.createdAt ?? null,
        updatedAt: (t as any)?.updatedAt ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<LocationEquipmentDto> {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }
    return {
      id: t.id,
      name: t.name,
      code: t.code,
      description: t.description,
      createdAt: (t as any)?.createdAt ?? null,
      updatedAt: (t as any)?.updatedAt ?? null,
    };
  }

  async create(dto: CreateLocationEquipmentDto): Promise<LocationEquipmentDto> {
    const existingName = await this.repo.findOne({ where: { name: dto.name } });
    if (existingName) {
      throw new ConflictException(ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD]);
    }

    if (dto.code) {
      const existingCode = await this.repo.findOne({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Mã vị trí thiết bị đã tồn tại');
      }
    }

    const item = this.repo.create(dto);
    const saved = await this.repo.save(item);
    return {
      id: saved.id,
      name: saved.name,
      code: saved.code,
      description: saved.description,
      createdAt: (saved as any)?.createdAt ?? null,
      updatedAt: (saved as any)?.updatedAt ?? null,
    };
  }

  async update(
    id: string,
    dto: UpdateLocationEquipmentDto,
  ): Promise<LocationEquipmentDto> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    // Kiểm tra trùng tên nếu có thay đổi
    if (dto.name && dto.name !== item.name) {
      const duplicateName = await this.repo.findOne({
        where: { name: dto.name },
      });
      if (duplicateName) {
        throw new ConflictException(
          ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD],
        );
      }
    }

    // Kiểm tra trùng code nếu có thay đổi
    if (dto.code && dto.code !== item.code) {
      const duplicateCode = await this.repo.findOne({
        where: { code: dto.code },
      });
      if (duplicateCode) {
        throw new ConflictException('Mã vị trí thiết bị đã tồn tại');
      }
    }

    Object.assign(item, dto);
    const updated = await this.repo.save(item);
    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      description: updated.description,
      createdAt: (updated as any)?.createdAt ?? null,
      updatedAt: (updated as any)?.updatedAt ?? null,
    };
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    // Kiểm tra ràng buộc: có thiết bị đang tham chiếu vị trí này
    const referencingCount = await this.equipmentRepository.count({
      where: { location_id: id as any },
    });
    if (referencingCount > 0) {
      throw new BadRequestException(
        ERROR_MESSAGES[ERROR_CODES.CONSTRAINT_VIOLATION],
      );
    }

    await this.repo.delete(id);
  }
}
