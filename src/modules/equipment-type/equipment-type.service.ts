import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from 'src/entities/equipment.entity';
import { EquipmentType } from 'src/entities/equipment-type.entity';
import {
  EquipmentTypeDto,
  CreateEquipmentTypeDto,
  UpdateEquipmentTypeDto,
} from 'src/common/interfaces/dto/equipment-type.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Injectable()
export class EquipmentTypeService {
  constructor(
    @InjectRepository(EquipmentType)
    private readonly equipmentTypeRepository: Repository<EquipmentType>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<EquipmentTypeDto>> {
    const [types, total] = await this.equipmentTypeRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      items: types.map((t) => ({
        id: t.id,
        name: t.name,
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

  async findOne(id: string): Promise<EquipmentTypeDto> {
    const t = await this.equipmentTypeRepository.findOne({ where: { id } });
    if (!t) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: (t as any)?.createdAt ?? null,
      updatedAt: (t as any)?.updatedAt ?? null,
    };
  }

  async create(dto: CreateEquipmentTypeDto): Promise<EquipmentTypeDto> {
    // Kiểm tra trùng tên
    const existing = await this.equipmentTypeRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD]);
    }

    const newType = this.equipmentTypeRepository.create(dto);
    const saved = await this.equipmentTypeRepository.save(newType);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      createdAt: (saved as any)?.createdAt ?? null,
      updatedAt: (saved as any)?.updatedAt ?? null,
    };
  }

  async update(
    id: string,
    dto: UpdateEquipmentTypeDto,
  ): Promise<EquipmentTypeDto> {
    const type = await this.equipmentTypeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    // Kiểm tra trùng tên (nếu người dùng đổi tên)
    if (dto.name && dto.name !== type.name) {
      const duplicate = await this.equipmentTypeRepository.findOne({
        where: { name: dto.name },
      });
      if (duplicate) {
        throw new ConflictException(
          ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD],
        );
      }
    }

    Object.assign(type, dto);
    const updated = await this.equipmentTypeRepository.save(type);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      createdAt: (updated as any)?.createdAt ?? null,
      updatedAt: (updated as any)?.updatedAt ?? null,
    };
  }

  async delete(id: string): Promise<void> {
    const type = await this.equipmentTypeRepository.findOne({ where: { id } });
    if (!type) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    // Kiểm tra ràng buộc: tồn tại thiết bị tham chiếu loại này
    const referencingCount = await this.equipmentRepository.count({
      where: { equipment_type_id: id as any },
    });
    if (referencingCount > 0) {
      throw new BadRequestException(
        ERROR_MESSAGES[ERROR_CODES.CONSTRAINT_VIOLATION],
      );
    }

    await this.equipmentTypeRepository.delete(id);
  }
}
