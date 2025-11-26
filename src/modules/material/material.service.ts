import { BadRequestException, ConflictException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { CreateMaterialDto, MaterialDto, MaterialIemDto, MaterialListItemDto, UpdateMaterialDto } from 'src/common/interfaces/dto/material.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { Material } from 'src/entities/material.entity';
import { ILike, Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { MaterialType } from 'src/entities/material-type.entity';
@Injectable()
export class MaterialService {
  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(MaterialType)
    private readonly materialTypeRepository: Repository<MaterialType>

  ) { }
  private toDto(e: Material): MaterialListItemDto {
    return {
      id: (e as any).id,
      code: e.code,
      name: e.name,
      price: e.price,
      specification:e.specification,
      material_type_id: e.material_type_id,
      unit: e.unit,
      createdAt: (e as any).createdAt ?? null,
      updatedAt: (e as any).updatedAt ?? null,
    };
  }

  private toSubDto(e: Material): MaterialIemDto {
    return {
      id: (e as any).id,
      code: e.code,
      name: e.name,
      unit: e.unit,
    }
  }

  async getAll(): Promise<MaterialIemDto[]> {

    const materials = await this.materialRepository.find({
      select: ['id', 'name', 'unit']
    });

    return materials.map((e) => this.toSubDto(e));
  }


  async findAll(
  limit = 20,
  page = 1,
  search?: string,
  minPrice?: number,
  maxPrice?: number,
): Promise<PaginatedResponse<MaterialDto>> {
  const query = this.materialRepository
    .createQueryBuilder('material')
    .leftJoinAndSelect('material.materialType', 'materialType');
    

  // Search theo name hoặc code
  if (search) {
    query.andWhere(
      '(LOWER(material.name) LIKE :search OR LOWER(material.code) LIKE :search)',
      { search: `%${search.toLowerCase()}%` },
    );
  }

  // Filter khoảng giá
  if (minPrice != null) {
    query.andWhere('material.price >= :minPrice', { minPrice });
  }

  if (maxPrice != null) {
    query.andWhere('material.price <= :maxPrice', { maxPrice });
  }

  // Phân trang
  query.skip((page - 1) * limit).take(limit);

  // Sắp xếp
  query.orderBy('material.createdAt', 'DESC');

  const [items, total] = await query.getManyAndCount();

  return {
    items: items.map((e) => this.toDto(e)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


  async findById(id: string): Promise<MaterialDto> {
    const checkExist = await this.materialRepository.findOne({ where: { id } })
    if (!checkExist) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    return this.toDto(checkExist)
  }

  async create(data: CreateMaterialDto): Promise<MaterialDto> {
  if (!data.code || data.code.trim() === '') {
    throw new BadRequestException({
      errCode: ERROR_CODES.CODE_NULL,
      message: ERROR_MESSAGES[ERROR_CODES.CODE_NULL],
    });
  }

  // Check trùng mã
  const checkExist = await this.materialRepository.findOne({
    where: { code: data.code },
  });
  if (checkExist) {
    throw new BadRequestException({
      errCode: ERROR_CODES.DUPLICATE_RECORD,
      message: 'Mã vật tư đã tồn tại',
    });
  }

  const isEmay = /dây\s*e\s*may|day\s*e\s*may|dây\s*emay|day\s*emay|dayemay/i;
  const autoSpecification = isEmay.test(data.code) ? 1 : 0.8;

  // Check loại vật tư
  const type = await this.materialTypeRepository.findOne({
    where: { id: data.material_type_id },
  });
  if (!type) throw new BadRequestException('Loại vật tư không tồn tại');

  const newData = this.materialRepository.create({
    ...data,
    specification: autoSpecification, 
  });

  const saved = await this.materialRepository.save(newData);
  return this.toDto(saved);
}


  async update(id: string, data: UpdateMaterialDto): Promise<MaterialDto> {
  const checkExist = await this.materialRepository.findOne({ where: { id } });
  if (!checkExist) {
    throw new NotFoundException({
      errCode: ERROR_CODES.RECORD_NOT_FOUND,
      message: 'Vật tư không tồn tại',
    });
  }

  // Check trùng mã khi sửa
  if (data.code && checkExist.code.toLowerCase() !== data.code.toLowerCase()) {
    const duplicate = await this.materialRepository.findOne({
      where: { code: data.code },
    });
    if (duplicate) {
      throw new BadRequestException({
        errCode: ERROR_CODES.DUPLICATE_RECORD,
        message: 'Mã vật tư đã tồn tại',
      });
    }
  }

  if (data.code) {
    const isEmay = /dây\s*e\s*may|day\s*e\s*may|dây\s*emay|day\s*emay|dayemay/i;
    data.specification = isEmay.test(data.code) ? 1 : 0.8;
  }

  // Check loại vật tư
  if (data.material_type_id) {
    const type = await this.materialTypeRepository.findOne({
      where: { id: data.material_type_id },
    });
    if (!type) throw new BadRequestException('Loại vật tư không tồn tại');
  }

  const entity = this.materialRepository.merge(checkExist, data);
  const saved = await this.materialRepository.save(entity);
  return this.toDto(saved);
}

  async remove(id: string): Promise<void> {
    const checkSuccess = await this.materialRepository.delete(id)
    if (checkSuccess.affected == 0) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }
  }

async downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');

  sheet.columns = [
    { header: 'Tên vật tư', key: 'name', width: 30 },
    { header: 'Mã vật tư', key: 'code', width: 20 },
    { header: 'Giá', key: 'price', width: 15 },
    { header: 'Loại vật tư', key: 'material_type_name', width: 30 },
    { header: 'Đơn vị', key: 'unit', width: 15 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new StreamableFile(
    new Uint8Array(buffer),
    {
      disposition: 'attachment; filename="material_template.xlsx"',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  );
}

async exportExcelCurrentPage(
  page = 1,
  limit = 20,
  filters?: { name?: string; code?: string }
): Promise<StreamableFile> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách vật tư');

  // Header
  sheet.columns = [
    { header: 'Tên vật tư', key: 'name', width: 30 },
    { header: 'Mã vật tư', key: 'code', width: 20 },
    { header: 'Giá', key: 'price', width: 15 },
    { header: 'Quy cách', key: 'specification', width: 15 },
    { header: 'Loại vật tư', key: 'material_type_name', width: 30 },
    { header: 'Đơn vị', key: 'unit', width: 15 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  // Build query
  const query = this.materialRepository.createQueryBuilder('material')
    .leftJoinAndSelect('material.materialType', 'materialType')
    .orderBy('material.createdAt', 'DESC');

  if (filters?.name) {
    query.andWhere('material.name ILIKE :name', { name: `%${filters.name}%` });
  }

  if (filters?.code) {
    query.andWhere('material.code ILIKE :code', { code: `%${filters.code}%` });
  }

  // Lấy dữ liệu theo page hiện tại
  const materials = await query
    .skip((page - 1) * limit)
    .take(limit)
    .getMany();

  // Thêm dữ liệu vào sheet
  for (const m of materials) {
    sheet.addRow({
      name: m.name,
      code: m.code,
      price: m.price,
      specification: m.specification,
      material_type_name: (m as any).materialType?.name || '',
      unit: m.unit,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new StreamableFile(new Uint8Array(buffer), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: 'attachment; filename="material_export_page.xlsx"',
  });
}


async importTemplate(file: Express.Multer.File) {
  if (!file) throw new BadRequestException('Không có file được upload');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file.buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  const materials: any[] = [];
  const errorRows: any[] = [];

  const getCellValue = (cell: ExcelJS.Cell): string => {
    if (!cell?.value) return '';
    if (typeof cell.value === 'string') return cell.value.trim();
    if (typeof cell.value === 'number') return cell.value.toString();
    if (cell.value && typeof (cell.value as any).text === 'string') return (cell.value as any).text.trim();
    return '';
  };

  sheet.eachRow({ includeEmpty: true }, (row, index) => {
    if (index === 1) return; 

    const name = getCellValue(row.getCell(1));
    const code = getCellValue(row.getCell(2));
    const priceRaw = row.getCell(3).value;
    const material_type_name = getCellValue(row.getCell(4));
    const unit = getCellValue(row.getCell(5));

    let price: number | null = null;

    const isEmpty = !name && !code && !priceRaw && !material_type_name && !unit;
    if (isEmpty) return;

    // ===== Validate =====
    const rowErrors: string[] = [];
    if (!name) rowErrors.push('Thiếu Tên vật tư');
    if (!code) rowErrors.push('Thiếu Mã vật tư');
    if (!unit) rowErrors.push('Thiếu Đơn vị');
    if (!material_type_name) rowErrors.push('Thiếu Loại vật tư');

    // validate price
    if (priceRaw !== null && priceRaw !== undefined) {
      if (typeof priceRaw === 'number' && priceRaw > 0 && Number.isInteger(priceRaw)) {
        price = priceRaw;
      } else {
        rowErrors.push('Giá phải là số nguyên dương');
      }
    }

    const isEmay = /dây\s*e\s*may|day\s*e\s*may|dây\s*emay|day\s*emay|dayemay/i;
    const specification = isEmay.test(code) ? 1 : 0.8;

    materials.push({
      name,
      code,
      price,
      specification, 
      material_type_name,
      unit,
      rowErrors,
      rowIndex: index
    });
  });

  const created: any[] = [];

  for (const item of materials) {
    const rowErrors: string[] = [...item.rowErrors];

    const type = await this.materialTypeRepository.findOne({ where: { name: item.material_type_name } });
    if (!type) rowErrors.push('Loại vật tư không tồn tại');

    const existCode = await this.materialRepository.findOne({ where: { code: item.code } });
    if (existCode) rowErrors.push('Vật tư đã tồn tại (mã)');

    if (rowErrors.length > 0) {
      errorRows.push({ ...item, reason: rowErrors.join('; ') });
      continue;
    }

    try {
      const entity = this.materialRepository.create({
        name: item.name,
        code: item.code,
        price: item.price,
        specification: item.specification, 
        material_type_id: type.id,
        unit: item.unit,
      });

      created.push(await this.materialRepository.save(entity));
    } catch (err) {
      errorRows.push({
        ...item,
        reason: [...rowErrors, `Lỗi khi lưu DB: ${err.message}`].join('; ')
      });
    }
  }

  // ===== Tạo file lỗi =====
  let errorFileBuffer: Buffer | null = null;
  if (errorRows.length > 0) {
    const errorWorkbook = new ExcelJS.Workbook();
    const errorSheet = errorWorkbook.addWorksheet('Errors');

    errorSheet.columns = [
      { header: 'Tên vật tư', key: 'name', width: 30 },
      { header: 'Mã vật tư', key: 'code', width: 20 },
      { header: 'Giá', key: 'price', width: 15 },
      { header: 'Loại vật tư', key: 'material_type_name', width: 30 },
      { header: 'Đơn vị', key: 'unit', width: 15 },
      { header: 'Lỗi', key: 'reason', width: 50 },
    ];

    for (const e of errorRows) errorSheet.addRow(e);
    errorSheet.getRow(1).font = { bold: true };
    errorSheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await errorWorkbook.xlsx.writeBuffer();
    errorFileBuffer = Buffer.from(buffer);
  }

  return {
    ...(errorFileBuffer && { errorFile: errorFileBuffer }),
    imported: created.length,
    skipped: errorRows.length,
    total: materials.length,
    message:
      errorRows.length > 0
        ? `Có ${errorRows.length} dòng lỗi, vui lòng xem file lỗi.`
        : 'Import thành công toàn bộ vật tư.',
  };
}

async exportExcel(): Promise<StreamableFile> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách vật tư');

  // Header
  sheet.columns = [
    { header: 'Tên vật tư', key: 'name', width: 30 },
    { header: 'Mã vật tư', key: 'code', width: 20 },
    { header: 'Giá', key: 'price', width: 15 },
    { header: 'Quy cách', key: 'specification', width: 15 },
    { header: 'Loại vật tư', key: 'material_type_name', width: 30 },
    { header: 'Đơn vị', key: 'unit', width: 15 },
    { header: 'Ngày tạo', key: 'createdAt', width: 20 },
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5E5' } };
  });

  // Lấy dữ liệu
  const materials = await this.materialRepository.find({
    relations: ['materialType'],
    order: { createdAt: 'DESC' } as any,
  });

  for (const m of materials) {
    sheet.addRow({
      name: m.name,
      code: m.code,
      price: m.price,
      specification: m.specification,
      material_type_name: (m as any).materialType?.name || '',
      unit: m.unit,
      createdAt: m.createdAt ? m.createdAt.toISOString().split('T')[0] : '',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new StreamableFile(new Uint8Array(buffer), {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    disposition: 'attachment; filename="material_export.xlsx"',
  });
}

}
