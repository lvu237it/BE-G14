import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { CreateMaterialTypeDto, MaterialTypeDto, UpdateMaterialTypeDto } from 'src/common/interfaces/dto/material-type.dto';
import { MaterialType } from 'src/entities/material-type.entity';
import { Material } from 'src/entities/material.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MaterialTypeService {
  constructor(
    @InjectRepository(MaterialType)
    private readonly materialTypeRepository: Repository<MaterialType>,

    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>

  ) { }


  async findAll(): Promise<MaterialTypeDto[]> {
    const types = await this.materialTypeRepository.find({})
    if (!types) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }
    return types.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: (t as any)?.createdAt ?? null,
      updatedAt: (t as any)?.updatedAt ?? null,
    }))
  }

  async create(data: CreateMaterialTypeDto): Promise<MaterialTypeDto> {
    if (!data.name || data.name.trim() === '') {
      throw new BadRequestException('Tên không thể trống');
    }
    const checkName = await this.materialTypeRepository.findOne({
      where: { name: data.name }
    })

    if (checkName && checkName.name.toLowerCase() === data.name.toLowerCase()) {
      throw new ConflictException({
        errCode: ERROR_CODES.DUPLICATE_RECORD,
        message: ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD]
      })
    }

    const newType: MaterialType = this.materialTypeRepository.create(data);
    const save: MaterialType = await this.materialTypeRepository.save(newType);

    return {
      id: save.id,
      name: save.name,
      description: save.description,
      createdAt: (save as any)?.createdAt ?? null
    }
  }

  async update(id: string, data: UpdateMaterialTypeDto): Promise<MaterialTypeDto> {
    const checkExist = await this.materialTypeRepository.findOne({
      where: { id: id as any }
    })

    if (!checkExist) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    if (data.name && data.name.toLowerCase() !== checkExist.name.toLowerCase()) {
      const duplicateName = await this.materialTypeRepository.findOne({ where: { name: data.name } })
      if (duplicateName) {
        throw new ConflictException(ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD])
      }
    }

    const entity: MaterialType = Object.assign(checkExist, data as unknown as Partial<MaterialType>) as MaterialType
    const updated: MaterialType = await this.materialTypeRepository.save(checkExist);
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      updatedAt: (updated as any)?.updatedAt ?? null
    }
  }


  async remove(id: string): Promise<void> {
    const checkExistInMaterial = await this.materialRepository.findOne({ where: { material_type_id: id } })
    if (checkExistInMaterial) {
      throw new BadRequestException({
        errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: ERROR_MESSAGES[ERROR_CODES.CONSTRAINT_VIOLATION]
      })
    }
    const checkExist = await this.materialTypeRepository.delete(id)
    if (checkExist.affected == 0) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]
      });
    }
  }
}
