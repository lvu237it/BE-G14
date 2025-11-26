import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { settlementRepairBallotSignMap } from 'src/common/constants/position_map';
import {
  SettlementRepairBallotListItemDto,
  SettlementRepairBallotUpdateItemsDto,
} from 'src/common/interfaces/dto/settlement-repair-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import {
  Department,
  Equipment,
  MaterialSupplyBallot,
  Position,
  User,
} from 'src/entities';
import { HistoryRepair } from 'src/entities/history-repair.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { SettlementRepairLabor } from 'src/entities/settlement-repair-labor.entity';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';
import { ILike, In, Repository } from 'typeorm';
import { WorkItemService } from '../work-item/work-item.service';
import {
  getNowVietnamTime,
  toVietnamTime,
} from 'src/common/utils/timezone.util';

@Injectable()
export class SettlementRepairBallotService {
  constructor(
    @InjectRepository(SettlementRepairBallot)
    private readonly srbRepo: Repository<SettlementRepairBallot>,

    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,

    @InjectRepository(Position)
    private readonly posRepo: Repository<Position>,

    @InjectRepository(Department)
    private readonly depRepo: Repository<Department>,

    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
    @InjectRepository(HistoryRepair)
    private readonly historyRepo: Repository<HistoryRepair>,

    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    private readonly historyRepairService: HistoryRepairService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'pending' | 'approved' | 'in_progress' | 'rejected';
      equipment_id?: string;
      sortBy?: 'name' | 'equipment_id' | 'status' | 'createdAt' | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<SettlementRepairBallotListItemDto>> {
    const qb = this.srbRepo.createQueryBuilder('s');

    if (filters?.status)
      qb.andWhere('s.status = :status', { status: filters.status });
    if (filters?.equipment_id)
      qb.andWhere('s.equipment_id = :equipment_id', {
        equipment_id: filters.equipment_id,
      });
    if (filters?.search) {
      const search = `%${filters.search}%`;
      qb.andWhere('(LOWER(s.name) LIKE LOWER(:search))', { search });
    }

    // Sort
    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`s.${sortField}`, sortOrder);

    // Pagination
    qb.skip((page - 1) * limit).take(limit);
    qb.leftJoinAndSelect('s.items_material', 'material');
    qb.leftJoinAndSelect('s.items_labor', 'labor');

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((b) => this.toDto(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<SettlementRepairBallotListItemDto> {
    const ballot = await this.srbRepo.findOne({
      where: { id },
      relations: [
        'equipment',
        'equipment.department',
        'creatorUser',
        'creatorUser.department',
        'siteManagerUser',
        'siteManagerUser.department',
        'siteManagerUser.position',
        'headSettlementUser',
        'headSettlementUser.department',
        'planUser',
        'planUser.department',
        'financeUser',
        'financeUser.department',
        'transportUser',
        'transportUser.department',
        'organizeUser',
        'organizeUser.department',
        'items_material',
        'items_labor',
      ],
    });

    if (!ballot) throw new NotFoundException('Phiếu không tồn tại');
    return this.toDto(ballot);
  }
  async updateItems(
    id: string,
    dto: SettlementRepairBallotUpdateItemsDto,
    userId: any,
  ): Promise<SettlementRepairBallotListItemDto | null> {
    const ballot = await this.srbRepo.findOne({
      where: { id },
      relations: [
        'items_material',
        'items_labor',
        'equipment',
        'creatorUser',
        'siteManagerUser',
        'headSettlementUser',
        'planUser',
        'financeUser',
        'transportUser',
        'organizeUser',
      ],
    });

    if (!ballot) return null;

    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;

    ballot.creator_id = approverId || null;

    // --- Update vật tư (chỉ các trường được phép) ---
    if (dto.items_material && dto.items_material.length) {
      ballot.items_material = ballot.items_material.map((m) => {
        const updated = dto.items_material.find(
          (i) => i.material_id === m.material_id,
        );
        if (updated) {
          // Chỉ update các field được phép: quantity, notes, price
          m.notes = updated.notes ?? m.notes;
        }
        return m;
      });
    }

    // --- Update or create labor items ---
    if (dto.items_labor && dto.items_labor.length) {
      // Convert existing items to a map for fast lookup
      const existingMap = new Map(
        ballot.items_labor.map((l) => [l.job_name, l]),
      );

      const newLaborList: SettlementRepairLabor[] = [];

      for (const item of dto.items_labor) {
        const existing = existingMap.get(item.job_name);

        if (existing) {
          // --- UPDATE ---
          existing.name = item.name ?? existing.name;
          existing.worker_type = item.worker_type ?? existing.worker_type;
          existing.work_days = item.work_days ?? existing.work_days;
          existing.unit_price = item.unit_price ?? existing.unit_price;
          existing.skill_level = item.skill_level ?? existing.skill_level;
          existing.notes = item.notes ?? existing.notes;
          existing.total =
            (existing.work_days ?? 0) * (existing.unit_price ?? 0);

          newLaborList.push(existing);
        } else {
          // --- CREATE NEW ---
          const labor = new SettlementRepairLabor();
          labor.settlementRepairBallot = ballot;
          labor.name = item.name ?? '';
          labor.job_name = item.job_name;
          labor.worker_type = item.worker_type;
          labor.work_days = item.work_days ?? 0;
          labor.unit_price = item.unit_price ?? 0;
          labor.skill_level = item.skill_level ?? '';
          labor.notes = item.notes ?? '';
          labor.total = (item.work_days ?? 0) * (item.unit_price ?? 0);

          newLaborList.push(labor);
        }
      }

      // gán lại danh sách mới sau khi xử lý
      ballot.items_labor = newLaborList;
    }

    ballot.totalMaterial = ballot.items_material.reduce(
      (sum, item) => sum + (item.total ?? 0),
      0,
    );

    ballot.totalLabor = ballot.items_labor.reduce(
      (sum, item) => sum + (item.total ?? 0),
      0,
    );

    // Set trạng thái về pending sau khi chỉnh sửa
    ballot.status = 'pending';

    const positionKHDT = await this.posRepo.findOne({
      where: { code: ILike('tpkhdt') },
    });
    const userKhdt = await this.userRepo.findOne({
      where: { position_id: positionKHDT.id },
    });
    ballot.planner_id=userKhdt.id;

    const positionTCKT = await this.posRepo.findOne({
      where: { code: ILike('tptckt') },
    });
    const userTckt = await this.userRepo.findOne({
      where: { position_id: positionTCKT.id },
    });
    ballot.finance_id=userTckt.id;

    const positionCDVT = await this.posRepo.findOne({
      where: { code: ILike('tpcdvt') },
    });
    const userCdvt = await this.userRepo.findOne({
      where: { position_id: positionCDVT.id },
    });
    ballot.transport_id=userCdvt.id;

    const positionForeman = await this.posRepo.findOne({
      where: { code: ILike('PGD') },
    });
    const userForeman = await this.userRepo.findOne({
      where: { position_id: positionForeman.id },
    });
    ballot.head_settlement_id=userForeman.id;

    const positionOrganize = await this.posRepo.findOne({
      where: { code: ILike('tptcld') },
    });
    const userOrganize = await this.userRepo.findOne({
      where: { position_id: positionOrganize.id },
    });
    ballot.organize_id=userOrganize.id;

    const saved = await this.srbRepo.save(ballot);

    // --- Lịch sử ---
    try {
      await this.historyRepairService.addBallotToHistory(
        saved.equipment_id,
        'SRB',
        saved.id,
      );
    } catch (e) {
      console.warn(
        'history-repair add failed for SRB create/update',
        e?.message || e,
      );
    }

    // --- Hoàn thành task hiện tại ---
    await this.workItemService.completeByRef(
      approverId,
      'SRB',
      saved.id,
      'create_ballot',
    );

    // --- Tạo task cho foreman ký ---
    const msbRepair = await this.msbRepo.findOne({
      where: {
        equipment_id: saved.equipment_id,
        level_repair: In(['Xưởng sửa chữa', 'Xưởng bảo dưỡng']),
      },
    });
    if (msbRepair) {
      const departmentUser = await this.depRepo.findOne({
        where: { name: ILike('Phân Xưởng 7') },
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
          ref_type: 'SRB',
          ref_id: saved.id,
          task_type: 'sign',
          task_name: 'Ký biên bản thanh toán sửa chữa',
          ballot_name: saved.name,
          start_date: new Date(),
        },
        approverId,
      );
    }
    const msbFix = await this.msbRepo.findOne({
      where: {
        equipment_id: saved.equipment_id,
        level_repair: In(['Sửa chữa', 'Bảo dưỡng']),
      },
    });
    if (msbFix) {
      const departmentUser = await this.depRepo.findOne({
        where: { id: saved.equipment_id },
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
          ref_type: 'SRB',
          ref_id: saved.id,
          task_type: 'sign',
          task_name: 'Ký biên bản thanh toán sửa chữa',
          ballot_name: saved.name,
          start_date: new Date(),
        },
        approverId,
      );
    }

    return this.toDto(saved);
  }

  async sign(
    ballotId: string,
    user: any,
  ): Promise<SettlementRepairBallotListItemDto> {
    const srb = await this.srbRepo.findOne({ where: { id: ballotId } });
    if (!srb) {
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
    const field = settlementRepairBallotSignMap[positionCode];

    if (!field || !(field in srb)) {
      throw new BadRequestException(
        'Bạn không được phép ký mục nào trên phiếu này!',
      );
    }

    if (srb[field]) {
      throw new BadRequestException('Mục này đã có người ký!');
    }

    (srb as any)[field] = user.id;
    srb.updatedBy = user.id;
    srb.status = 'approved';
    await this.srbRepo.save(srb);

    await this.workItemService.completeByRef(user.id, 'SRB', ballotId, 'sign');

    // KIỂM TRA HOÀN THÀNH TOÀN BỘ 6 PHIẾU Ở ĐÂY

    const equipmentId = srb.equipment_id;

    const history = await this.historyRepo.findOne({
      where: { equipment_id: equipmentId },
      order: { createdAt: 'DESC' },
      relations: [
        'technicalAppraisalBallot',
        'detailAppraisalBallot',
        'assignmentBallot',
        'acceptanceRepairBallot',
        'settlementRepairBallot',
        'qualityAssessmentBallot',
      ],
    });

    if (!history) return this.toDto(srb);

    const allExist =
      history.technicalAppraisalBallot &&
      history.detailAppraisalBallot &&
      history.assignmentBallot &&
      history.acceptanceRepairBallot &&
      history.settlementRepairBallot &&
      history.qualityAssessmentBallot;

    const allFinished =
      allExist &&
      (history.technicalAppraisalBallot as any).status === 'done' &&
      (history.detailAppraisalBallot as any).status === 'done' &&
      (history.assignmentBallot as any).status === 'done' &&
      (history.acceptanceRepairBallot as any).status === 'done' &&
      (history.settlementRepairBallot as any).status === 'approved' &&
      (history.qualityAssessmentBallot as any).status === 'approved';

    if (allFinished) {
      const repairRequest = await this.repairRequestRepo.findOne({
        where: { equipment_id: equipmentId },
        order: { createdAt: 'DESC' },
      });

      if (repairRequest) {
        const allMsbsForDates = await this.msbRepo.find({
          where: { repair_request_id: repairRequest.id },
          order: { createdAt: 'ASC' },
        });

        // start_date
        let start_date = history.start_date ?? null;
        if (!start_date) {
          for (const msb of allMsbsForDates) {
            if (msb.status === 'in_progress' || msb.status === 'done') {
              const rawDate = msb.updatedAt || msb.createdAt;
              start_date = toVietnamTime(rawDate) || rawDate;
              break;
            }
          }
        }

        const end_date = getNowVietnamTime();
        repairRequest.end_date = end_date;
        history.start_date = start_date;
        history.end_date = end_date;
        history.status = 'done';
        await this.historyRepo.save(history);

        // Gộp phiếu xin cấp vật tư
        await this.historyRepairService.checkAndMergeMSBs(
          repairRequest.id,
          equipmentId,
        );

        // Cập nhật RepairRequest
        repairRequest.status = 'done';
        await this.repairRequestRepo.save(repairRequest);

        // Cập nhật thiết bị
        await this.equipmentRepo.update(
          { id: repairRequest.equipment_id },
          { status: 'active' },
        );
      }
    }

    return this.toDto(srb);
  }

  private toDto(b: SettlementRepairBallot): SettlementRepairBallotListItemDto {
    return {
      id: b.id,
      name: b.name,

      equipment: b.equipment
        ? {
            id: b.equipment.id,
            name: b.equipment.name,
            code: b.equipment.code,
            department: b.equipment.department
              ? {
                  id: b.equipment.department.id,
                  name: b.equipment.department.name,
                }
              : null,
          }
        : null,

      creatorUser: b.creatorUser
        ? {
            id: b.creatorUser.id,
            name: `${b.creatorUser.lastname ?? ''} ${b.creatorUser.firstname ?? ''}`.trim(),
            department: b.creatorUser.department
              ? {
                  id: b.creatorUser.department.id,
                  name: b.creatorUser.department.name,
                }
              : null,
          }
        : null,

      siteManagerUser: b.siteManagerUser
        ? {
            id: b.siteManagerUser.id,
            name: `${b.siteManagerUser.lastname ?? ''} ${b.siteManagerUser.firstname ?? ''}`.trim(),
            department: b.siteManagerUser.department
              ? {
                  id: b.siteManagerUser.department.id,
                  name: b.siteManagerUser.department.name,
                }
              : null,
            position: b.siteManagerUser.position
              ? {
                  id: b.siteManagerUser.position.id,
                  name: b.siteManagerUser.position.name,
                }
              : null,
          }
        : null,

      headSettlementUser: b.headSettlementUser
        ? {
            id: b.headSettlementUser.id,
            name: `${b.headSettlementUser.lastname ?? ''} ${b.headSettlementUser.firstname ?? ''}`.trim(),
            department: b.headSettlementUser.department
              ? {
                  id: b.headSettlementUser.department.id,
                  name: b.headSettlementUser.department.name,
                }
              : null,
          }
        : null,

      planUser: b.planUser
        ? {
            id: b.planUser.id,
            name: `${b.planUser.lastname ?? ''} ${b.planUser.firstname ?? ''}`.trim(),
            department: b.planUser.department
              ? {
                  id: b.planUser.department.id,
                  name: b.planUser.department.name,
                }
              : null,
          }
        : null,

      financeUser: b.financeUser
        ? {
            id: b.financeUser.id,
            name: `${b.financeUser.lastname ?? ''} ${b.financeUser.firstname ?? ''}`.trim(),
            department: b.financeUser.department
              ? {
                  id: b.financeUser.department.id,
                  name: b.financeUser.department.name,
                }
              : null,
          }
        : null,

      transportUser: b.transportUser
        ? {
            id: b.transportUser.id,
            name: `${b.transportUser.lastname ?? ''} ${b.transportUser.firstname ?? ''}`.trim(),
            department: b.transportUser.department
              ? {
                  id: b.transportUser.department.id,
                  name: b.transportUser.department.name,
                }
              : null,
          }
        : null,

      organizeUser: b.organizeUser
        ? {
            id: b.organizeUser.id,
            name: `${b.organizeUser.lastname ?? ''} ${b.organizeUser.firstname ?? ''}`.trim(),
            department: b.organizeUser.department
              ? {
                  id: b.organizeUser.department.id,
                  name: b.organizeUser.department.name,
                }
              : null,
          }
        : null,

      status: b.status,
      totalMaterial: b.totalMaterial,
      totalLabor: b.totalLabor,
      createdAt: b.createdAt ?? null,
      updatedAt: b.updatedAt ?? null,

      items_material: b.items_material?.map((m) => ({
        id: m.id,
        material_id: m.material_id,
        name: m.name,
        unit: m.unit,
        quantity: m.quantity,
        price: m.price,
        total: m.total,
        notes: m.notes,
      })),

      items_labor: b.items_labor?.map((l) => ({
        id: l.id,
        name: l.name,
        job_name: l.job_name,
        worker_type: l.worker_type,
        work_days: l.work_days,
        skill_level: l.skill_level,
        unit_price: l.unit_price,
        total: l.total,
        notes: l.notes,
      })),
    };
  }
}
