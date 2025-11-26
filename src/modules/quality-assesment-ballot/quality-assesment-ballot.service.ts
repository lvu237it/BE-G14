import { SettlementRepairBallot } from './../../entities/settlement-repair-ballot.entity';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import {
  QualityAssessmentBallotListItemDto,
  QualityAssessmentBallotCreateDto,
  QualityAssessmentItemDto,
  QualityAssessmentBallotUpdateItemsDto,
} from 'src/common/interfaces/dto/quality-assessment-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import {
  Department,
  Equipment,
  MaterialSupplyBallot,
  Position,
  User,
} from 'src/entities';
import { qualityAssessmentBallotSignMap } from 'src/common/constants/position_map';
import { WorkItemService } from '../work-item/work-item.service';
import { QualityAssessmentItem } from 'src/entities/quality-assessment-item.entity';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';
import { use } from 'passport';
import { Material } from 'src/entities/material.entity';
import { SettlementRepairMaterial } from 'src/entities/settlement-repair-material.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
@Injectable()
export class QualityAssessmentBallotService {
  constructor(
    @InjectRepository(QualityAssessmentBallot)
    private readonly qabRepository: Repository<QualityAssessmentBallot>,

    @InjectRepository(SettlementRepairBallot)
    private readonly settlementRepairBallotRepository: Repository<SettlementRepairBallot>,

    @InjectRepository(SettlementRepairMaterial)
    private readonly srbMaterialRepo: Repository<SettlementRepairMaterial>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Material)
    private readonly materialRepo: Repository<Material>,

    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,

    @InjectRepository(Department)
    private readonly depRepo: Repository<Department>,

    @InjectRepository(Position)
    private readonly posRepo: Repository<Position>,

    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,

    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,

    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    private readonly historyRepairService: HistoryRepairService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'pending' | 'approved' | 'rejected';
      equipment_id?: string;
      deputy_director_id?: string;
      lead_finance_accounting_id?: string;
      lead_first_plan?: string;
      lead_transport_mechanic?: string;
      request_no?: string;
      sortBy?:
        | 'name'
        | 'request_no'
        | 'equipment_id'
        | 'status'
        | 'createdAt'
        | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<QualityAssessmentBallotListItemDto>> {
    const qb = this.qabRepository.createQueryBuilder('q');

    if (filters?.status)
      qb.andWhere('q.status = :status', { status: filters.status });

    if (filters?.equipment_id)
      qb.andWhere('q.equipment_id = :equipment_id', {
        equipment_id: filters.equipment_id,
      });

    if (filters?.request_no)
      qb.andWhere('q.request_no = :request_no', {
        request_no: filters.request_no,
      });

    if (filters?.deputy_director_id)
      qb.andWhere('q.deputy_director_id = :deputy_director_id', {
        deputy_director_id: filters.deputy_director_id,
      });

    if (filters?.lead_finance_accounting_id)
      qb.andWhere(
        'q.lead_finance_accounting_id = :lead_finance_accounting_id',
        {
          lead_finance_accounting_id: filters.lead_finance_accounting_id,
        },
      );

    if (filters?.lead_first_plan)
      qb.andWhere('q.lead_first_plan = :lead_first_plan', {
        lead_first_plan: filters.lead_first_plan,
      });

    if (filters?.lead_transport_mechanic)
      qb.andWhere('q.lead_transport_mechanic = :lead_transport_mechanic', {
        lead_transport_mechanic: filters.lead_transport_mechanic,
      });

    if (filters?.search) {
      const search = `%${filters.search}%`;
      qb.andWhere(
        '(LOWER(q.name) LIKE LOWER(:search) OR LOWER(q.notes) LIKE LOWER(:search))',
        { search },
      );
    }

    // Sort
    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`q.${sortField}`, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((q) => this.toDto(q)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<QualityAssessmentBallotListItemDto> {
    const e = await this.qabRepository.findOne({
      where: { id: id as any },
      relations: [
        'items',
        'equipment',
        'equipment.department',
        'deputyDirector',
        'financeUser',
        'planUser',
        'transportUser',
        'deputyDirector.department',
        'financeUser.department',
        'planUser.department',
        'transportUser.department',
        'deputyDirector.position',
        'financeUser.position',
        'planUser.position',
        'transportUser.position',
      ],
    });
    let signUsers = [];
  if (e.sign_ids?.length) {
    signUsers = await this.userRepo.find({
      where: { id: In(e.sign_ids) },
      relations: ['department', 'position']
    });
  }
    if (!e)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    return this.toDto(e,signUsers);
  }

  async create(
    dto: QualityAssessmentBallotCreateDto,
  ): Promise<QualityAssessmentBallotListItemDto> {
    const { items, ...ballotData } = dto;

    // Validate trùng material_id trong danh sách items
    if (items && items.length > 0) {
      const materialIds = items.map((item) => item.material_id);
      const duplicateIds = materialIds.filter(
        (id, index) => materialIds.indexOf(id) !== index,
      );

      if (duplicateIds.length > 0) {
        throw new HttpException(
          {
            errCode: ERROR_CODES.VALIDATION_ERROR,
            message: `Không được thêm trùng vật tư: ${[...new Set(duplicateIds)].join(', ')}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const entity = this.qabRepository.create({
      ...ballotData,
      items: items?.map((item) => ({
        ...item,
      })),
    });

    const saved = await this.qabRepository.save(entity);
    try {
      await this.historyRepairService.addBallotToHistory(
        (saved as any).equipment_id,
        'QAB',
        saved.id,
      );
    } catch (e) {
      console.warn('history-repair add failed for QAB create', e?.message || e);
    }
    return this.toDto(saved);
  }

  async approve(
    id: string,
    userId: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    const entity = await this.qabRepository.findOne({ where: { id } });
    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;
    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    entity.status = 'in_progress';
    entity.statusButton = 'created';


    const positionKHDT = await this.posRepo.findOne({
      where: { code: ILike('tpkhdt') },
    });
    const userKhdt = await this.userRepo.findOne({
      where: { position_id: positionKHDT.id },
    });
    await this.workItemService.create(
      {
        user_id: userKhdt.id,
        ref_type: 'QAB',
        ref_id: entity.id,
        task_type: 'sign',
        task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );

    const positionTCKT = await this.posRepo.findOne({
      where: { code: ILike('tptckt') },
    });
    const userTckt = await this.userRepo.findOne({
      where: { position_id: positionTCKT.id },
    });
    await this.workItemService.create(
      {
        user_id: userTckt.id,
        ref_type: 'QAB',
        ref_id: entity.id,
        task_type: 'sign',
        task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );

    const positionCDVT = await this.posRepo.findOne({
      where: { code: ILike('tpcdvt') },
    });
    const userCdvt = await this.userRepo.findOne({
      where: { position_id: positionCDVT.id },
    });
    await this.workItemService.create(
      {
        user_id: userCdvt.id,
        ref_type: 'QAB',
        ref_id: entity.id,
        task_type: 'sign',
        task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );

    const positionForeman = await this.posRepo.findOne({
      where: { code: ILike('PGD') },
    });
    const userForeman = await this.userRepo.findOne({
      where: { position_id: positionForeman.id },
    });
    await this.workItemService.create(
      {
        user_id: userForeman.id,
        ref_type: 'QAB',
        ref_id: entity.id,
        task_type: 'sign',
        task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );
    await this.workItemService.completeByRef(
      approverId,
      'QAB',
      entity.id,
      'approve_reject_adjust',
    );
    entity.sign_ids = [userKhdt.id,userForeman.id,userCdvt.id,userTckt.id].filter(Boolean);
    const saved = await this.qabRepository.save(entity);
    return this.toDto(saved);
  }

  async reject(
    id: string,
    user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    const entity = await this.qabRepository.findOne({ where: { id } });

    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    entity.status = 'pending';
    entity.statusButton = 'updated';
    const saved = await this.qabRepository.save(entity);
    await this.workItemService.completeByRef(
      user.id,
      'QAB',
      entity.id,
      'approve_reject_adjust',
    );
    const department = await this.msbRepo.findOne({
      where: { equipment_id: saved.equipment_id },
    });
    await this.workItemService.create(
      {
        user_id: department.deputy_foreman_id,
        ref_type: 'QAB',
        ref_id: entity.id,
        task_type: 'update_items',
        task_name: 'Cập nhật số lượng vật tư',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      user.id,
    );

    return this.toDto(saved);
  }

  async sign(
    ballotId: string,
    user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    const qab = await this.qabRepository.findOne({
      where: { id: ballotId },
      relations: [
        'items',
        'equipment',
        'equipment.department',
        'deputyDirector',
        'financeUser',
        'planUser',
        'transportUser',
        'deputyDirector.department',
        'financeUser.department',
        'planUser.department',
        'transportUser.department',
        'deputyDirector.position',
        'financeUser.position',
        'planUser.position',
        'transportUser.position',
      ],
    });

    if (!qab) {
      throw new NotFoundException(ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND]);
    }

    let userWithPosition = user;
    if (!user.position) {
      userWithPosition = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['position'],
      });
    }

    if (!userWithPosition || !userWithPosition.position?.code) {
      throw new BadRequestException(
        'Người ký không hợp lệ hoặc không có chức vụ.',
      );
    }

    const positionCode = userWithPosition.position.code.toLowerCase();
    // console.log(positionCode);
    const field = qualityAssessmentBallotSignMap[positionCode];
    if (!field || !(field in qab)) {
      throw new BadRequestException(
        'Bạn không được phép ký mục nào trên phiếu này!',
      );
    }

    if (qab[field]) {
      throw new BadRequestException('Mục này đã có người ký!');
    }

    // ✅ Gán người ký
    (qab as any)[field] = user.id;
    qab.updatedBy = user.id;
    await this.qabRepository.save(qab);

    // ✅ Đánh dấu hoàn thành công việc "sign"
    await this.workItemService.completeByRef(user.id, 'QAB', qab.id, 'sign');

    // ✅ CHỈ tạo công việc phê duyệt khi người ký là TPTCKT
    if (positionCode === 'tptckt') {
      const positionTCKT = await this.posRepo.findOne({
        where: { code: ILike('tptckt') },
      });

      if (positionTCKT) {
        const userTckt = await this.userRepo.findOne({
          where: { position_id: positionTCKT.id },
        });
        if (userTckt) {
          await this.workItemService.create(
            {
              user_id: userTckt.id,
              ref_type: 'QAB',
              ref_id: qab.id,
              task_type: 'approve',
              task_name: 'Phê duyệt đánh giá chất lượng sau sửa chữa',
              ballot_name: qab.name,
              start_date: new Date(),
            },
            userTckt.id,
          );
        }
      }
    }

    return this.toDto(qab);
  }

  async updateItems(
    ballotId: string,
    dto: QualityAssessmentBallotUpdateItemsDto,
    user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    // 1. Lấy phiếu và các item hiện tại
    const qab = await this.qabRepository.findOne({
      where: { id: ballotId },
      relations: ['items'],
    });

    if (!qab) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const itemsDto = dto.items || [];

    // 2. Validate trùng material_id
    const duplicateIds = itemsDto.filter(
      (item, index) =>
        itemsDto.findIndex((i) => i.material_id === item.material_id) !== index,
    );
    if (duplicateIds.length > 0) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: `Không được thêm trùng vật tư: ${[...new Set(duplicateIds.map((i) => i.material_id))].join(', ')}`,
      });
    }

    // 3. Xóa item cũ (nếu muốn overwrite hoàn toàn)
    if (qab.items && qab.items.length > 0) {
      await this.qabRepository.manager.remove(qab.items);
    }

    // 4. Tạo item mới gán FK
    const itemsEntity: QualityAssessmentItem[] = itemsDto.map((item) =>
      this.qabRepository.manager.create(QualityAssessmentItem, {
        ...item,
        quality_assessment_ballot_id: qab.id, // gán FK trực tiếp
      }),
    );

    qab.items = itemsEntity;
    qab.statusButton = 'updated';
    qab.status = 'in_progress';

    // 5. Lưu phiếu
    const saved = await this.qabRepository.save(qab);
      await this.workItemService.completeByRef(
      user.id,
      'QAB',
      qab.id,
      'update_items',
    );
    const msbRepair = await this.msbRepo.findOne({where:{equipment_id:saved.equipment_id,level_repair: In(['Xưởng sửa chữa', 'Xưởng bảo dưỡng'])}})
    if(msbRepair){
    const departmentUser = await this.depRepo.findOne({
      where: { name : ILike('Phân Xưởng 7') }
    });
    const positionforeMan = await this.posRepo.findOne({
      where: { department: { id: departmentUser.id }, code: ILike('QD') },
      relations: ['department'],
    });

    const userWork = await this.userRepo.findOne({
      where: { position_id: positionforeMan.id },
    });
    await this.workItemService.create(
      {
        user_id: userWork.id,
        ref_type: 'QAB',
        ref_id: qab.id,
        task_type: 'approve_reject_adjust',
        task_name: 'Xác nhận và từ chối biên bản',
        ballot_name: qab.name,
        start_date: new Date(),
      },
      user.id,
    );
    }
    const msbFix = await this.msbRepo.findOne({where:{equipment_id:saved.equipment_id,level_repair: In(['Sửa chữa', 'Bảo dưỡng'])}})
    if(msbFix){
    const departmentUser = await this.depRepo.findOne({
      where: { id:saved.equipment_id }
    });
    const positionforeMan = await this.posRepo.findOne({
      where: { department: { id: departmentUser.id }, code: ILike('QD') },
      relations: ['department'],
    });

    const userWork = await this.userRepo.findOne({
      where: { position_id: positionforeMan.id },
    });
    await this.workItemService.create(
      {
        user_id: userWork.id,
        ref_type: 'QAB',
        ref_id: qab.id,
        task_type: 'approve_reject_adjust',
        task_name: 'Xác nhận và từ chối biên bản',
        ballot_name: qab.name,
        start_date: new Date(),
      },
      user.id,
    );
    }

    // 6. Ghi log công việc (work item)
    
    await this.workItemService.completeByRef(
      user.id,
      'QAB',
      qab.id,
      'approve_create',
    );

    return this.toDto(saved);
  }

async finalApprove(
  id: string,
  userId: any,
): Promise<QualityAssessmentBallotListItemDto> {
  const entity = await this.qabRepository.findOne({
    where: { id },
    relations: ['items'], // load items
  });

  const approverId: string =
    typeof userId === 'object' && userId !== null
      ? userId.id || userId.userId
      : userId;

  if (!entity) {
    throw new NotFoundException({
      errCode: ERROR_CODES.RECORD_NOT_FOUND,
      message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
    });
  }

  if (
    !entity.lead_finance_accounting_id ||
    !entity.lead_first_plan ||
    !entity.lead_transport_mechanic ||
    !entity.deputy_director_id
  ) {
    throw new BadRequestException({
      errCode: ERROR_CODES.VALIDATION_ERROR,
      message: 'Phiếu chưa được ký đầy đủ, không thể phê duyệt!',
    });
  }

  // --- TÍNH NUMBER_SCRAP ---
  if (entity.items && entity.items.length > 0) {
    // Lấy danh sách material_id từ items
    const materialIds = entity.items.map(i => i.material_id);
    
    // Query Material để lấy specification
    const materials = await this.materialRepo.findByIds(materialIds);

    // Tính tổng number_scrap
    entity.number_scrap = entity.items.reduce((total, item) => {
      const spec = materials.find(m => m.id === item.material_id)?.specification ?? 0;
      return total + (item.quantity ?? 0) * spec;
    }, 0);
  }
    const repairRequest = await this.repairRequestRepo.findOne({
      where: {
        equipment_id: entity.equipment_id,
        status: 'pending' as any,
      },
      order: { createdAt: 'DESC' as any },
    });

    if (!repairRequest) return;

    const repairRequestId = (repairRequest as any).id;
  // --- tạo settlement repair ballot ---
  const settlementRepairBallot =
    await this.settlementRepairBallotRepository.create({
      name: `Thanh lý sửa chữa - ${entity.name}`,
      equipment_id: entity.equipment_id,
      status: '',
    });

  const savedSettle = await this.settlementRepairBallotRepository.save(settlementRepairBallot);
  
  try {
    await this.historyRepairService.addBallotToHistory(
      entity.equipment_id as any,
      'SRB',
      savedSettle.id,
    );
     await this.historyRepairService.addBallotToRepairRequest(
        repairRequestId,
        'SRB',
        savedSettle.id,
      );
  } catch (e) {
    console.warn(
      'history-repair add failed for SRB (from QAB finalApprove)',
      e?.message || e,
    );
  }

  await this.workItemService.completeByRef(approverId, 'QAB', id, 'sign');

  const department = await this.msbRepo.findOne({
    where: { equipment_id: entity.equipment_id },
  });

  if (department.deputy_foreman_id == null) {
    throw new BadRequestException({
      errCode: ERROR_CODES.VALIDATION_ERROR,
      message: 'Không tìm thấy phó quản đốc',
    });
  }
  
  // Lấy tất cả MSB + details + material
const msbList = await this.msbRepo.find({
  where: { equipment_id: entity.equipment_id },
  relations: ['details', 'details.material'],
});

// --- GOM NHÓM VẬT TƯ ---
const materialMap = new Map<string, any>();

for (const ballot of msbList) {
  for (const d of ballot.details) {
    const materialId = d.material_id;
    if (!materialId) continue;

    const quantity = d.quantity_approve ?? d.quantity_request ?? 0;
    const price = d.material?.price ?? 0;
    const total = quantity * price;

    // Nếu chưa có thì tạo mới
    if (!materialMap.has(materialId)) {
      materialMap.set(materialId, {
        settlementRepairBallot: savedSettle,
        name: d.material?.name ?? '',
        material_id: materialId,
        manufacture_year: null,
        unit: d.material?.unit ?? '',
        quantity: 0,
        price: price,
        total: 0,
        notes: d.notes ?? '',
      });
    }

    // Cộng dồn số lượng + tổng tiền
    const entry = materialMap.get(materialId);
    entry.quantity += quantity;
    entry.total += total;
  }
}

// Convert map → array để lưu DB
const itemsMaterial = Array.from(materialMap.values());

// Lưu settlement_repair_material
if (itemsMaterial.length) {
  await this.srbMaterialRepo.save(itemsMaterial);
}

  await this.workItemService.create(
    {
      user_id: department.deputy_foreman_id,
      ref_type: 'SRB',
      ref_id: savedSettle.id,
      task_type: 'create_ballot',
      task_name: 'Tạo biên bản quyết toán sửa chữa',
      ballot_name: savedSettle.name,
      start_date: new Date(),
    },
    approverId,
  );

  entity.status = 'approved';
  const savedEntity = await this.qabRepository.save(entity);

  await this.workItemService.completeByRef(
    approverId,
    'QAB',
    entity.id,
    'approve',
  );

  return this.toDto(savedEntity);
}


  async approveCreate(
    ballotId: string,
    dto: QualityAssessmentBallotUpdateItemsDto,
    user: any,
  ): Promise<QualityAssessmentBallotListItemDto> {
    const qab = await this.qabRepository.findOne({
      where: { id: ballotId },
      relations: ['items'],
    });

    if (!qab) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const itemsDto = dto.items || [];

    // Validate trùng material_id
    const duplicateIds = itemsDto.filter(
      (item, index) =>
        itemsDto.findIndex((i) => i.material_id === item.material_id) !== index,
    );
    if (duplicateIds.length > 0) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: `Không được thêm trùng vật tư: ${[...new Set(duplicateIds.map((i) => i.material_id))].join(', ')}`,
      });
    }

    // Map DTO sang entity có liên kết đúng
    const itemsEntity: QualityAssessmentItem[] = itemsDto.map((item) =>
      this.qabRepository.manager.create(QualityAssessmentItem, {
        ...item,
        qualityAssessmentBallot: qab,
      }),
    );

    qab.items = itemsEntity;
    qab.statusButton = 'created';
    qab.status = 'pending';

    const saved = await this.qabRepository.save(qab);
    const department = await this.equipmentRepo.findOne({
      where: { id: qab.equipment_id },
    });
    // console.log(department);
    const departmentUser = await this.depRepo.findOne({
      where: { id: department.department_id },
    });
    // console.log(departmentUser);
    const positionforeMan = await this.posRepo.findOne({
      where: { department: { id: departmentUser.id }, code: ILike('QD') },
      relations: ['department'],
    });
    // console.log(positionforeMan);

    const userWork = await this.userRepo.findOne({
      where: { position_id: positionforeMan.id },
    });
    await this.workItemService.create(
      {
        user_id: userWork.id,
        ref_type: 'QAB',
        ref_id: qab.id,
        task_type: 'approve_reject_adjust',
        task_name: 'Xác nhận hoặc từ chối đánh giá chất lượng sau sửa chữa',
        ballot_name: qab.name,
        start_date: new Date(),
      },
      user.id,
    );
    // console.log(user.id, qab.id);
    await this.workItemService.completeByRef(
      user.id,
      'QAB',
      qab.id,
      'approve_create',
    );

    return this.toDto(saved);
  }

  private toDto(
    q: QualityAssessmentBallot,
    signUsers: User[] = [],
  ): QualityAssessmentBallotListItemDto {
    return {
      id: q.id,
      name: q.name,
      equipment: q.equipment
        ? {
            id: q.equipment.id,
            name: q.equipment.name,
            code: q.equipment.code,
            department: q.equipment.department
              ? {
                  id: q.equipment.department.id,
                  name: q.equipment.department.name,
                }
              : null,
          }
        : null,
      request_no: q.request_no ?? null,
      notes: q.notes ?? null,
      deputyDirector: q.deputyDirector
        ? {
            id: q.deputyDirector.id,
            name: `${q.deputyDirector.lastname ?? ''} ${q.deputyDirector.firstname ?? ''}`.trim(),
            department: q.deputyDirector.department
              ? {
                  id: q.deputyDirector.department.id,
                  name: q.deputyDirector.department.name,
                }
              : null,
            position: q.deputyDirector.position
              ? {
                  id: q.deputyDirector.position.id,
                  name: q.deputyDirector.position.name,
                  code: q.deputyDirector.position.code,
                }
              : null,
          }
        : null,
      financeUser: q.financeUser
        ? {
            id: q.financeUser.id,
            name: `${q.financeUser.lastname ?? ''} ${q.financeUser.firstname ?? ''}`.trim(),
            department: q.financeUser.department
              ? {
                  id: q.financeUser.department.id,
                  name: q.financeUser.department.name,
                }
              : null,
            position: q.financeUser.position
              ? {
                  id: q.financeUser.position.id,
                  name: q.financeUser.position.name,
                  code: q.financeUser.position.code,
                }
              : null,
          }
        : null,
      planUser: q.planUser
        ? {
            id: q.planUser.id,
            name: `${q.planUser.lastname ?? ''} ${q.planUser.firstname ?? ''}`.trim(),
            department: q.planUser.department
              ? {
                  id: q.planUser.department.id,
                  name: q.planUser.department.name,
                }
              : null,
            position: q.planUser.position
              ? {
                  id: q.planUser.position.id,
                  name: q.planUser.position.name,
                  code: q.planUser.position.code,
                }
              : null,
          }
        : null,
      transportUser: q.transportUser
        ? {
            id: q.transportUser.id,
            name: `${q.transportUser.lastname ?? ''} ${q.transportUser.firstname ?? ''}`.trim(),
            department: q.transportUser.department
              ? {
                  id: q.transportUser.department.id,
                  name: q.transportUser.department.name,
                }
              : null,
            position: q.transportUser.position
              ? {
                  id: q.transportUser.position.id,
                  name: q.transportUser.position.name,
                  code: q.transportUser.position.code,
                }
              : null,
          }
        : null,
         signUsers: signUsers.map(u => ({
      id: u.id,
      name: `${u.lastname ?? ''} ${u.firstname ?? ''}`.trim(),
      department: u.department
        ? { id: u.department.id, name: u.department.name }
        : null,
      position: u.position
        ? { id: u.position.id, name: u.position.name, code: u.position.code }
        : null,
    })),
      status: q.status,
      statusButton: q.statusButton,
      createdAt: q.createdAt ?? null,
      updatedAt: q.updatedAt ?? null,
      items: q.items?.map((item) => ({
        id: item.id,
        material_id: item.material_id,
        unit: item.unit,
        quantity: item.quantity,
        technical_status: item.technical_status,
        treatment_measure: item.treatment_measure,
        notes: item.notes,
      })),
    };
  }
}
