import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateEquipmentDto,
  EquipmentListItemDto,
  HistoryEquipmentListItemDto,
  UpdateEquipmentDto,
} from 'src/common/interfaces/dto/equipment.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { HistoryEquipment } from 'src/entities/history-equipment.entity';

@Injectable()
export class HistoryEquipmentService {
  constructor(
    @InjectRepository(HistoryEquipment)
    private readonly historyEquipmentRepo: Repository<HistoryEquipment>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'active' | 'inactive' | 'maintenance' | 'broken';
      equipment_id?: string;
      equipment_type_id?: string;
      department_id?: string;
      location_id?: string;
      code?: string;
      name?: string;
      inventory_number?: string;
      sortBy?:
        | 'code'
        | 'name'
        | 'inventory_number'
        | 'status'
        | 'createdAt'
        | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<HistoryEquipmentListItemDto>> {
    const qb = this.historyEquipmentRepo.createQueryBuilder('e');
    if (filters?.status)
      qb.andWhere('e.status = :status', { status: filters.status });
    if (filters?.equipment_id)
      qb.andWhere('e.equipment_id = :equipment_id', { equipment_id: filters.equipment_id });
    if (filters?.equipment_type_id)
      qb.andWhere('e.equipment_type_id = :equipment_type_id', {
        equipment_type_id: filters.equipment_type_id,
      });
    if (filters?.department_id)
      qb.andWhere('e.department_id = :department_id', {
        department_id: filters.department_id,
      });
    if (filters?.location_id)
      qb.andWhere('e.location_id = :location_id', {
        location_id: filters.location_id,
      });
    if (filters?.code)
      qb.andWhere('LOWER(e.code) LIKE LOWER(:code)', {
        code: `%${filters.code}%`,
      });
    if (filters?.name)
      qb.andWhere('LOWER(e.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    if (filters?.inventory_number)
      qb.andWhere('LOWER(e.inventory_number) LIKE LOWER(:inventory_number)', {
        inventory_number: `%${filters.inventory_number}%`,
      });
    if (filters?.search) {
      const search = `%${filters.search}%`;
      qb.andWhere(
        '(LOWER(e.code) LIKE LOWER(:search) OR LOWER(e.name) LIKE LOWER(:search) OR LOWER(e.inventory_number) LIKE LOWER(:search))',
        { search },
      );
    }

    // Sort
    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`e.${sortField}`, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((e) => this.toDto(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<HistoryEquipmentListItemDto> {
    const e = await this.historyEquipmentRepo.findOne({
      where: { id: id as any },
    });
    if (!e)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    return this.toDto(e);
  }


  private toDto(e: HistoryEquipment): HistoryEquipmentListItemDto {
    return {
      id: (e as any).id,
      equipment_id: e.equipment_id,
      code: e.code,
      name: e.name,
      unit: e.unit ?? null,
      location_id: e.location_id ?? null,
      department_id: e.department_id ?? null,
      equipment_type_id: e.equipment_type_id ?? null,
      inventory_number: e.inventory_number,
      status: e.status,
      createdAt: (e as any).createdAt ?? null,
      updatedAt: (e as any).updatedAt ?? null,
    };
  }
}
