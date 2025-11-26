import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { DepartmentListItemDto } from 'src/common/interfaces/dto/department.dto';
import {
  CreateEquipmentDto,
  EquipmentItemDto,
  EquipmentListItemDto,
  HistoryEquipmentListItemDto,
  UpdateEquipmentDto,
} from 'src/common/interfaces/dto/equipment.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { Department } from 'src/entities/department.entity';
import { EquipmentType } from 'src/entities/equipment-type.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { HistoryEquipment } from 'src/entities/history-equipment.entity';
import { LocationEquipment } from 'src/entities/location-equipment.entity';
import { ILike, Repository } from 'typeorm';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    @InjectRepository(HistoryEquipment)
    private readonly historyEquipmentRepo: Repository<HistoryEquipment>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(LocationEquipment)
    private readonly locationEquipmentRepository: Repository<LocationEquipment>,
    @InjectRepository(EquipmentType)
    private readonly equipmentTypeRepository: Repository<EquipmentType>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'active' | 'inactive' | 'maintenance' | 'broken';
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
  ): Promise<PaginatedResponse<EquipmentListItemDto>> {
    const qb = this.equipmentRepository.createQueryBuilder('e');
    if (filters?.status)
      qb.andWhere('e.status = :status', { status: filters.status });
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

  async findOne(id: string): Promise<EquipmentListItemDto> {
    const e = await this.equipmentRepository.findOne({
      where: { id: id as any },
    });
    if (!e)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    return this.toDto(e);
  }

  async create(dto: CreateEquipmentDto): Promise<EquipmentListItemDto> {
    // Kiểm tra code unique
    const existCode = await this.equipmentRepository.findOne({
      where: { code: dto.code },
    });
    if (existCode)
      throw new BadRequestException({
        errCode: ERROR_CODES.DUPLICATE_RECORD,
        message: 'Mã thiết bị đã tồn tại',
      });

    // Kiểm tra inventory_number unique
    const existInventory = await this.equipmentRepository.findOne({
      where: { inventory_number: dto.inventory_number },
    });
    if (existInventory)
      throw new BadRequestException({
        errCode: ERROR_CODES.DUPLICATE_RECORD,
        message: 'Số kiểm kê đã tồn tại',
      });

    const entity: Equipment = this.equipmentRepository.create(
      dto as unknown as Partial<Equipment>,
    ) as Equipment;

    const saved: Equipment = await this.equipmentRepository.save(entity);
    const historyEntity: HistoryEquipment = this.historyEquipmentRepo.create({
      ...dto,
      equipment_id: saved.id,
    } as unknown as Partial<HistoryEquipment>);

    await this.historyEquipmentRepo.save(historyEntity);
    return this.toDto(saved);
  }

  async update(
    id: string,
    dto: UpdateEquipmentDto,
  ): Promise<EquipmentListItemDto> {
    const e = await this.equipmentRepository.findOne({
      where: { id: id as any },
    });
    if (!e)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    // Kiểm tra code unique nếu có thay đổi
    if (dto.code && dto.code !== e.code) {
      const existCode = await this.equipmentRepository.findOne({
        where: { code: dto.code },
      });
      if (existCode)
        throw new BadRequestException({
          errCode: ERROR_CODES.DUPLICATE_RECORD,
          message: 'Mã thiết bị đã tồn tại',
        });
    }

    // Kiểm tra inventory_number unique nếu có thay đổi
    if (dto.inventory_number && dto.inventory_number !== e.inventory_number) {
      const existInventory = await this.equipmentRepository.findOne({
        where: { inventory_number: dto.inventory_number },
      });
      if (existInventory)
        throw new BadRequestException({
          errCode: ERROR_CODES.DUPLICATE_RECORD,
          message: 'Số kiểm kê đã tồn tại',
        });
    }

    Object.assign(e, dto as unknown as Partial<Equipment>);
    const saved: Equipment = await this.equipmentRepository.save(e);
    const historyEntity: HistoryEquipment = this.historyEquipmentRepo.create({
      ...dto,
      equipment_id: saved.id,
    } as unknown as Partial<HistoryEquipment>);

    await this.historyEquipmentRepo.save(historyEntity);
    return this.toDto(saved);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.equipmentRepository.findOne({
      where: { id: id as any },
    });
    if (!existing)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    if (existing.status === 'maintenance' || existing.status === 'active') {
      throw new BadRequestException({
        errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: 'Thiết bị đang sửa hoặc đang sử dụng, không thể xoá',
      });
    }

    try {
      const res = await this.equipmentRepository.delete(id);
      if (res.affected === 0)
        throw new NotFoundException({
          errCode: ERROR_CODES.RECORD_NOT_FOUND,
          message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
        });
    } catch (error: any) {
      const isFkViolation = error?.code === '23503'; /* Postgres */
      if (isFkViolation) {
        throw new BadRequestException({
          errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
          message:
            'Thiết bị đang được tham chiếu bởi dữ liệu khác, không thể xoá',
        });
      }
      throw error;
    }
  }

  private toDto(e: Equipment): EquipmentListItemDto {
    return {
      id: (e as any).id,
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

  private toSubDto(e: Equipment): EquipmentItemDto {
    return {
      id: (e as any).id,
      code: e.code,
      name: e.name,
    };
  }
  private toDtoHistory(e: HistoryEquipment): HistoryEquipmentListItemDto {
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

  async getDepartmentByEquipmentId(id: string): Promise<DepartmentListItemDto> {
    const equipment = await this.equipmentRepository.findOne({
      where: { id: id as any },
      relations: ['department'],
    });

    if (!equipment) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy thiết bị',
      });
    }

    if (!equipment.department_id) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Thiết bị không có phòng ban quản lý',
      });
    }

    const department = equipment.department
      ? equipment.department
      : await this.departmentRepository.findOne({
          where: { id: equipment.department_id as any },
        });

    if (!department) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy phòng ban',
      });
    }

    return {
      id: (department as any).id,
      code: department.code,
      name: department.name,
      description: department.description ?? '',
      createdAt: (department as any).createdAt ?? null,
      updatedAt: (department as any).updatedAt ?? null,
    };
  }

  async getAll(search?: string): Promise<EquipmentItemDto[]> {
    const whereCondition = search
      ? [{ name: ILike(`%${search}%`) }]
      : undefined;

    const equipments = await this.equipmentRepository.find({
      select: ['id', 'code', 'name'],
      where: whereCondition,
    });

    return equipments.map((e) => this.toSubDto(e));
  }

async downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  // ===== A. Cấu hình cột =====
  sheet.columns = [
    { header: 'Tên thiết bị', key: 'name', width: 30 },
    { header: 'Mã hiệu', key: 'code', width: 20 },
    { header: 'Số kiểm kê', key: 'inventory_number', width: 20 },
    { header: 'Vị trí lắp đặt', key: 'location_name', width: 25 },
    { header: 'Phòng ban', key: 'department_name', width: 25 },
    { header: 'Loại thiết bị', key: 'equipment_type_name', width: 30 },
    { header: 'ĐVT', key: 'unit', width: 15 },
  ];

  // ===== B. Style header =====
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new StreamableFile(
    new Uint8Array(buffer),
    {
      disposition: 'attachment; filename="equipment_template.xlsx"',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  );
}



async importTemplate(file: Express.Multer.File) {
  if (!file) throw new BadRequestException('Không có file được upload');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  const rows: any[] = [];
  const errorRows: any[] = [];

  const getCellValue = (cell: ExcelJS.Cell): string => {
    if (!cell?.value) return '';
    if (typeof cell.value === 'string') return cell.value.trim();
    if (typeof cell.value === 'number') return cell.value.toString();
    if (cell.value && typeof (cell.value as any).text === 'string')
      return (cell.value as any).text.trim();
    return '';
  };

  sheet.eachRow({ includeEmpty: true }, (row, index) => {
    if (index === 1) return; // header

    const name = getCellValue(row.getCell(1));
    const code = getCellValue(row.getCell(2));
    const inventory_number = getCellValue(row.getCell(3));
    const location_name = getCellValue(row.getCell(4));
    const department_name = getCellValue(row.getCell(5));
    const equipment_type_name = getCellValue(row.getCell(6));
    const unit = getCellValue(row.getCell(7));

    const isEmpty =
      !name && !code && !inventory_number &&
      !location_name && !department_name &&
      !equipment_type_name && !unit;

    if (isEmpty) return;

    const rowErrors: string[] = [];
    if (!name) rowErrors.push('Thiếu Tên thiết bị');
    if (!code || !inventory_number) rowErrors.push('Thiết bị phải có cả Mã hiệu và Số kiểm kê');

    rows.push({
      name,
      code,
      inventory_number,
      location_name,
      department_name,
      equipment_type_name,
      unit,
      rowErrors,
      rowIndex: index
    });
  });

  if (rows.length === 0) {
    errorRows.push({ reason: 'File rỗng hoặc không có dữ liệu' });
  }

  const created: any[] = [];

  for (const item of rows) {
    const rowErrors: string[] = [...item.rowErrors];

    try {
      // Location
      let locationId: string | null = null;
      if (item.location_name) {
        const loc = await this.locationEquipmentRepository.findOne({ where: { name: item.location_name } });
        if (!loc) rowErrors.push('Vị trí không tồn tại');
        else locationId = loc.id;
      }

      // Equipment type
      let typeId: string | null = null;
      if (item.equipment_type_name) {
        const t = await this.equipmentTypeRepository.findOne({ where: { name: item.equipment_type_name } });
        if (!t) rowErrors.push('Loại thiết bị không tồn tại');
        else typeId = t.id;
      }

      // Department
      let departmentId: string | null = null;
      if (item.department_name) {
        const dp = await this.departmentRepository.findOne({ where: { name: item.department_name } });
        if (!dp) rowErrors.push('Phòng ban không tồn tại');
        else departmentId = dp.id;
      }

      // Duplicate
      if (await this.equipmentRepository.findOne({ where: { code: item.code } }))
        rowErrors.push('Mã hiệu đã tồn tại');

      if (await this.equipmentRepository.findOne({ where: { inventory_number: item.inventory_number } }))
        rowErrors.push('Số kiểm kê đã tồn tại');

      if (rowErrors.length > 0) {
        errorRows.push({ ...item, reason: rowErrors.join('; ') });
        continue;
      }

      const entity = this.equipmentRepository.create({
        name: item.name,
        code: item.code,
        inventory_number: item.inventory_number,
        unit: item.unit || null,
        status: 'active',
        location_id: locationId,
        equipment_type_id: typeId,
        department_id: departmentId,
      });

      created.push(await this.equipmentRepository.save(entity));

    } catch (err) {
      errorRows.push({
        ...item,
        reason: [...rowErrors, `Lỗi khi lưu DB: ${err.message}`].join('; ')
      });
    }
  }

  // ====== TẠO FILE LỖI ======
  let errorFileBuffer: Buffer | null = null;

  if (errorRows.length > 0) {
    const errorWorkbook = new ExcelJS.Workbook();
    const errorSheet = errorWorkbook.addWorksheet('Errors');

    errorSheet.columns = [
      { header: 'Tên thiết bị', key: 'name', width: 30 },
      { header: 'Mã hiệu', key: 'code', width: 20 },
      { header: 'Số kiểm kê', key: 'inventory_number', width: 20 },
      { header: 'Vị trí', key: 'location_name', width: 20 },
      { header: 'Phòng ban', key: 'department_name', width: 20 },
      { header: 'Loại thiết bị', key: 'equipment_type_name', width: 25 },
      { header: 'Đơn vị', key: 'unit', width: 10 },
      { header: 'Lỗi', key: 'reason', width: 50 },
    ];

   errorSheet.getRow(1).font = { bold: true };

    for (const e of errorRows) {
      const row = errorSheet.addRow(e);
      row.getCell('reason').font = { color: { argb: 'FFFF0000' }, bold: true }; // đỏ
    }

    errorSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await errorWorkbook.xlsx.writeBuffer();
    errorFileBuffer = Buffer.from(buffer);
  }

  return {
    ...(errorFileBuffer && { errorFile: errorFileBuffer }),
    imported: created.length,
    skipped: errorRows.length,
    total: created.length + errorRows.length,
    message:
      errorRows.length > 0
        ? `Có ${errorRows.length} dòng lỗi, vui lòng kiểm tra file lỗi.`
        : 'Import thành công.',
  };
}


async exportExcelCurrentPage(
  page = 1,
  limit = 20,
  filters?: { name?: string; code?: string }
): Promise<StreamableFile> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách thiết bị');

  // Header
  sheet.columns = [
    { header: 'Tên thiết bị', key: 'name', width: 30 },
    { header: 'Mã hiệu', key: 'code', width: 20 },
    { header: 'Số kiểm kê', key: 'inventory_number', width: 20 },
    { header: 'Vị trí lắp đặt', key: 'location_name', width: 25 },
    { header: 'Phòng ban', key: 'department_name', width: 25 },
    { header: 'Loại thiết bị', key: 'equipment_type_name', width: 30 },
    { header: 'ĐVT', key: 'unit', width: 15 },
  ];

  // Style header
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  // Query
  const query = this.equipmentRepository.createQueryBuilder('e')
    .leftJoinAndSelect('e.department', 'department')
    .leftJoinAndSelect('e.location', 'location')
    .leftJoinAndSelect('e.equipmentType', 'equipmentType')
    .orderBy('e.createdAt', 'DESC');

  if (filters?.name) {
    query.andWhere('e.name ILIKE :name', { name: `%${filters.name}%` });
  }
  if (filters?.code) {
    query.andWhere('e.code ILIKE :code', { code: `%${filters.code}%` });
  }

  const equipments = await query
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();

  for (const e of equipments) {
    sheet.addRow({
      name: e.name,
      code: e.code,
      inventory_number: e.inventory_number,
      location_name: (e as any).location?.name || '',
      department_name: (e as any).department?.name || '',
      equipment_type_name: (e as any).equipmentType?.name || '',
      unit: e.unit,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new StreamableFile(new Uint8Array(buffer), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: 'attachment; filename="equipment_export_page.xlsx"',
  });
}

async exportExcel(): Promise<StreamableFile> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách thiết bị');

  // Header
  sheet.columns = [
    { header: 'Tên thiết bị', key: 'name', width: 30 },
    { header: 'Mã hiệu', key: 'code', width: 20 },
    { header: 'Số kiểm kê', key: 'inventory_number', width: 20 },
    { header: 'Vị trí lắp đặt', key: 'location_name', width: 25 },
    { header: 'Phòng ban', key: 'department_name', width: 25 },
    { header: 'Loại thiết bị', key: 'equipment_type_name', width: 30 },
    { header: 'ĐVT', key: 'unit', width: 15 }
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  const equipments = await this.equipmentRepository.find({
    relations: ['department', 'location', 'equipmentType'],
    order: { createdAt: 'DESC' } as any,
  });

  for (const e of equipments) {
    sheet.addRow({
      name: e.name,
      code: e.code,
      inventory_number: e.inventory_number,
      location_name: (e as any).location?.name || '',
      department_name: (e as any).department?.name || '',
      equipment_type_name: (e as any).equipmentType?.name || '',
      unit: e.unit
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new StreamableFile(new Uint8Array(buffer), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: 'attachment; filename="equipment_export.xlsx"',
  });
}


}
