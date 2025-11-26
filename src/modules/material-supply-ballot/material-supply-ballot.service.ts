import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { positionSignMapMSB } from 'src/common/constants/position_map';
import {
  ApproveMaterialSupplyBallotDto,
  CreateMaterialSupplyBallotWithDetailsDto,
  MaterialSupplyBallotListItemDto,
} from 'src/common/interfaces/dto/material-supply-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { AssignmentBallotApproval } from 'src/entities/assignment-ballot-approval.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { Department } from 'src/entities/department.entity';
import { DetailAppraisalBallotItem } from 'src/entities/detail-appraisal-ballot-item.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { Position } from 'src/entities/position.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { WorkItem } from 'src/entities/work-item.entity';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';
import { RepairWorkflowService } from 'src/modules/history-repair/repair-workflow.service';
import { Between, ILike, In, Not, Repository } from 'typeorm';
import { WorkItemService } from '../work-item/work-item.service';

@Injectable()
export class MaterialSupplyBallotService {
  constructor(
    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,
    @InjectRepository(TechnicalAppraisalBallot)
    private readonly tabRepo: Repository<TechnicalAppraisalBallot>,
    @InjectRepository(DetailAppraisalBallot)
    private readonly dabRepo: Repository<DetailAppraisalBallot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(AssignmentBallot)
    private readonly assignmentBallotRepo: Repository<AssignmentBallot>,
    @InjectRepository(AssignmentBallotApproval)
    private readonly assignmentBallotApprovalRepo: Repository<AssignmentBallotApproval>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
    @InjectRepository(AcceptanceRepairBallot)
    private readonly acceptanceRepairBallotRepo: Repository<AcceptanceRepairBallot>,
    @InjectRepository(MaterialSupplyBallotDetail)
    private readonly msbDetailRepo: Repository<MaterialSupplyBallotDetail>,
    @InjectRepository(DetailAppraisalBallotItem)
    private readonly dabItemRepo: Repository<DetailAppraisalBallotItem>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    private readonly historyRepairService: HistoryRepairService,
    private readonly repairWorkflowService: RepairWorkflowService,
  ) {}

  async create(
    dto: CreateMaterialSupplyBallotWithDetailsDto,
    creatorUserId: string,
  ): Promise<MaterialSupplyBallotListItemDto> {
    const { details, ...header } = dto;

    let name = header.name || 'Phiếu xin cấp vật tư';
    let equipmentName = '';

    // Load equipment name
    if ((header as any).equipment_id) {
      const equipment = await this.equipmentRepo.findOne({
        where: { id: (header as any).equipment_id },
      });
      if (equipment) {
        equipmentName = equipment.name;
      }
    }

    // --- Sửa lại logic đặt tên "Lần X" khi có repair_request_id ---
    if ((header as any).repair_request_id) {
      // Lấy toàn bộ phiếu chưa bị rejected của cùng repair_request_id (xếp theo createdAt ASC)
      const ballots = await this.msbRepo.find({
        where: {
          repair_request_id: (header as any).repair_request_id,
          status: Not('rejected' as any) as any,
        },
        order: { createdAt: 'ASC' as any },
      });
      const nextCount = ballots.length + 1;
      if (equipmentName) {
        name = `${equipmentName} - Phiếu xin cấp vật tư - Lần ${nextCount}`;
      } else {
        name = `Phiếu xin cấp vật tư - Lần ${nextCount}`;
      }
    }
    // Nếu chưa có repair_request_id thì không thêm Lần

    const entity = this.msbRepo.create({
      ...header,
      name,
      status: header.status ?? 'pending',
      details: (details ?? []).map((d) => ({
        ...d,
        createdBy: creatorUserId,
      })),
    } as unknown as Partial<MaterialSupplyBallot>);
    (entity as any).createdBy = creatorUserId;

    const saved = await this.msbRepo.save(entity);

    // 1. Tạo work item cho CĐVT (Phòng CĐVT) - Duyệt và điều chỉnh
    // Ưu tiên user cụ thể nếu đã có transport_mechanic_id trên MSB, nếu không thì tìm theo các alias code
    const cdvtAliases = [
      'transport_mechanic',
      'cdvt',
      'phong_cdvt',
      'CĐVT',
      'CDVT',
      'cđvt',
      'PCĐVT',
      'pcđvt',
      'pcdvt',
      'pcđvt',
    ];
    if ((saved as any).transport_mechanic_id) {
      await this.workItemService.create(
        {
          user_id: (saved as any).transport_mechanic_id,
          ref_type: 'MSB',
          ref_id: (saved as any).id,
          task_type: 'approve_adjust',
          task_name: 'Duyệt và điều chỉnh Phiếu xin cấp vật tư',
          ballot_name: saved.name,
          start_date: new Date(),
          status: 'pending',
        },
        creatorUserId,
      );
    } else {
      const phongCdvtPositions = await this.positionRepo.find({
        where: cdvtAliases.map((code) => ({ code })),
      });
      if (phongCdvtPositions.length > 0) {
        const phongCdvtUsers = await this.userRepo.find({
          where: {
            position_id: In(phongCdvtPositions.map((p: any) => p.id)),
            status: 'active',
          },
        });
        for (const user of phongCdvtUsers) {
          await this.workItemService.create(
            {
              user_id: (user as any).id,
              ref_type: 'MSB',
              ref_id: (saved as any).id,
              task_type: 'approve_adjust',
              task_name: 'Duyệt và điều chỉnh Phiếu xin cấp vật tư',
              ballot_name: saved.name,
              start_date: new Date(),
              status: 'pending',
            },
            creatorUserId,
          );
        }
      }
    }
    // KHÔNG tạo work item cho các vai trò khác khi TẠO phiếu!
    return this.toDto(saved);
  }

  private async computeRemainingByMaterial(equipment_id: string) {
    // Lấy toàn bộ phiếu của thiết bị (kèm details)
    const ballots = await this.msbRepo.find({
      where: { equipment_id: equipment_id as any },
      relations: ['details'],
      order: { createdAt: 'ASC' as any },
    });
    const summary = new Map<string, { approved: number; supplied: number }>();
    for (const b of ballots) {
      for (const d of (b as any).details || []) {
        const key = d.material_id;
        if (!key) continue;
        const agg = summary.get(key) || { approved: 0, supplied: 0 };
        agg.approved += Number(d.quantity_approve || 0);
        agg.supplied += Number(d.quantity_supplies || 0);
        summary.set(key, agg);
      }
    }
    const remaining = new Map<string, number>();
    for (const [key, agg] of summary.entries()) {
      remaining.set(key, Math.max(agg.approved - agg.supplied, 0));
    }
    return remaining;
  }

  async getDeputyForemenByEquipmentId(equipment_id: string): Promise<{
    items: any[];
    message?: string;
  }> {
    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipment_id as any },
      relations: ['department'],
    });

    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    if (!equipment.department_id) {
      throw new NotFoundException('Thiết bị không có phòng ban quản lý');
    }

    const quanDocPositionCodes = ['QD', 'QĐ', 'qđ', 'qd'];
    const quanDocPositions = await this.positionRepo.find({
      where: quanDocPositionCodes.map((code) => ({ code })),
    });

    // Tìm các position code của Phó quản đốc cơ điện
    const pqdPositionCodes = ['pqdcd', 'pqđcđ', 'PQDCD', 'PQĐCĐ'];
    const pqdPositions = await this.positionRepo.find({
      where: pqdPositionCodes.map((code) => ({ code })),
    });

    // Quản đốc và Phó quản đốc cơ điện thuộc department quản lý thiết bị
    const allPositionIds = [
      ...(quanDocPositions.map((p: any) => p.id) || []),
      ...(pqdPositions.map((p: any) => p.id) || []),
    ];

    const users =
      allPositionIds.length > 0
        ? await this.userRepo.find({
            where: {
              position_id: In(allPositionIds),
              department_id: equipment.department_id as any,
              status: 'active',
            },
            relations: ['position'],
          })
        : [];

    let departmentInfo = null;
    if (equipment.department_id) {
      const dept = await this.departmentRepo.findOne({
        where: { id: equipment.department_id as any },
      });
      if (dept) {
        departmentInfo = {
          id: (dept as any).id,
          code: dept.code,
          name: dept.name,
        };
      }
    }

    const items = users.map((u: any) => ({
      id: u.id,
      code: u.code,
      firstname: u.firstname,
      lastname: u.lastname,
      position: u.position
        ? {
            id: u.position.id,
            code: u.position.code,
            name: u.position.name,
          }
        : null,
      department: departmentInfo,
    }));

    if (items.length === 0) {
      return {
        items: [],
        message: `Không tìm thấy Phó quản đốc cơ điện hoặc Quản đốc nào thuộc phòng ban quản lý thiết bị này`,
      };
    }

    return { items };
  }

  async prepareForEquipment(equipment_id: string) {
    if (!equipment_id) {
      throw new BadRequestException('Thiếu equipment_id');
    }

    const equipment = await this.equipmentRepo.findOne({
      where: { id: equipment_id as any },
    });
    if (!equipment) {
      throw new NotFoundException('Không tìm thấy thiết bị');
    }

    // Tìm hoặc xác định repair_request hiện tại/tương lai
    let currentRepair = await this.repairRequestRepo.findOne({
      where: { equipment_id: equipment_id as any, status: 'pending' as any },
      relations: ['materialSupplyBallots'],
      order: { start_date: 'DESC' as any },
    });
    const openRepair = currentRepair;

    let forbidCreate = false;
    let forbidMessage = undefined;
    if (openRepair) {
      // Kiểm tra có AcceptanceRepairBallot (phiếu 04) trạng thái pending hoặc done chưa
      const arb = await this.acceptanceRepairBallotRepo.findOne({
        where: {
          equipment_id: equipment_id as any,
          status: In(['pending' as any, 'done' as any]) as any,
        },
      });
      if (arb) {
        forbidCreate = true;
        forbidMessage =
          'Thiết bị đang trong quá trình nghiệm thu chạy thử và bàn giao sau sửa chữa.';
      }

      // Kiểm tra: Nếu phiếu xin cấp vật tư lần 1 chưa có thủ kho ký thì không cho tạo phiếu lần 2
      if (!forbidCreate) {
        const allMsbsInRepair = await this.msbRepo.find({
          where: {
            repair_request_id: (openRepair as any).id,
            status: Not('rejected' as any) as any,
          },
          order: { createdAt: 'ASC' as any },
        });

        if (allMsbsInRepair.length > 0) {
          const firstMsb = allMsbsInRepair[0];

          // Kiểm tra MSB lần 1 chưa có thủ kho ký (chưa có lead_warehouse_id)
          // Chỉ kiểm tra nếu MSB lần 1 không phải draft (vì draft chưa cần ký)
          if (
            (firstMsb as any).status !== 'draft' &&
            !(firstMsb as any).lead_warehouse_id
          ) {
            forbidCreate = true;
            forbidMessage =
              'Không thể tạo thêm phiếu xin cấp vật tư khi Thủ Kho chưa nhập số lượng thực cấp.';
          }
        }
      }
    }

    // Lấy phiếu xin cấp vật tư trạng thái 'draft'
    const draftMsb = await this.msbRepo.findOne({
      where: { equipment_id: equipment_id as any, status: 'draft' as any },
      relations: ['details', 'details.material', 'equipment'],
      order: { createdAt: 'DESC' as any },
    });

    // Lấy phiếu xin cấp gần nhất (không filter trạng thái)
    const latestMsb = await this.msbRepo.findOne({
      where: { equipment_id: equipment_id as any },
      relations: ['details', 'details.material', 'equipment'],
      order: { createdAt: 'DESC' as any },
    });

    // Lấy detail gần nhất để phục vụ suggest
    const previous_ballot_detail = latestMsb
      ? await this.findDetail(latestMsb.id)
      : null;

    // Lọc các trường cần thiết
    let filtered_ballot = null;
    if (previous_ballot_detail) {
      filtered_ballot = {
        id: previous_ballot_detail.id,
        name: previous_ballot_detail.name,
        equipment: previous_ballot_detail.equipment,
        equipment_manager_id: previous_ballot_detail.equipment_manager_id,
        level_repair: previous_ballot_detail.level_repair,
        technical_status: previous_ballot_detail.technical_status,
        reason: previous_ballot_detail.reason,
        solution: previous_ballot_detail.solution,
        notes: previous_ballot_detail.notes,
        createdAt: previous_ballot_detail.createdAt,
        details: (previous_ballot_detail.details ?? []).map((d: any) => ({
          id: d.id,
          material: d.material,
          quantity_request: d.quantity_request,
          quantity_approve: d.quantity_approve,
          quantity_supplies: d.quantity_supplies,
          reason: d.reason,
          notes: d.notes,
        })),
      };
    }

    let suggestedDetails: any[] = [];

    if (latestMsb && Array.isArray(latestMsb.details)) {
      suggestedDetails = latestMsb.details
        .map((d: any) => {
          const qApprove = Number(d.quantity_approve || 0);
          const qSup = Number(d.quantity_supplies || 0);
          const remaining = qApprove - qSup;

          if (remaining > 0) {
            return {
              material: d.material
                ? {
                    id: d.material.id,
                    code: d.material.code,
                    name: d.material.name,
                    unit: d.material.unit,
                  }
                : undefined,
              reason: d.reason,
              notes: d.notes,
              quantity_approve: remaining,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    // Nếu có phiếu nháp => trả về luôn + suggest từ previous_ballot
    let draftBallot = null;
    if (draftMsb) {
      draftBallot = await this.findDetail(draftMsb.id);
    }

    if (draftBallot) {
      return {
        draft: true,
        message:
          'Thiết bị này đang có phiếu xin cấp vật tư ở trạng thái bản nháp. Bạn có muốn tiếp tục làm việc trên bản nháp này không?',
        equipment: equipment
          ? { code: (equipment as any).code, name: (equipment as any).name }
          : null,
        previous_ballot: {
          id: draftBallot.id,
          name: draftBallot.name,
          equipment: draftBallot.equipment,
          level_repair: draftBallot.level_repair,
          technical_status: draftBallot.technical_status,
          reason: draftBallot.reason,
          solution: draftBallot.solution,
          notes: draftBallot.notes,
          createdAt: draftBallot.createdAt,
          details: (draftBallot.details ?? []).map((d: any) => ({
            id: d.id,
            material: d.material,
            quantity_request: d.quantity_request,
            quantity_approve: d.quantity_approve,
            quantity_supplies: d.quantity_supplies,
            reason: d.reason,
            notes: d.notes,
          })),
        },
        suggested_details: filtered_ballot ? filtered_ballot.details : [],
      };
    }

    const hasMissing = suggestedDetails.length > 0;

    const hasConflict =
      (openRepair && draftMsb && draftMsb.status !== 'rejected') || hasMissing;

    // ===== FIX: Chỉ tính remaining TRONG repair_request hiện tại/tương lai =====
    let remainingMap = new Map<string, number>();

    if (currentRepair) {
      // Lấy tất cả MSB trong repair_request hiện tại
      const allMsbsInCurrentRepair = await this.msbRepo.find({
        where: { repair_request_id: (currentRepair as any).id },
        relations: ['details'],
        order: { createdAt: 'ASC' as any },
      });

      if (allMsbsInCurrentRepair.length > 0) {
        const summary = new Map<
          string,
          { approved: number; supplied: number }
        >();
        const firstMsb = allMsbsInCurrentRepair[0];

        // Tính approved từ MSB đầu tiên trong repair_request này (sử dụng quantity_approve)
        if (firstMsb) {
          for (const d of (firstMsb as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { approved: 0, supplied: 0 };
            agg.approved += Number(d.quantity_approve || 0);
            summary.set(key, agg);
          }
        }

        // Tính supplied từ tất cả MSB trong repair_request
        for (const b of allMsbsInCurrentRepair) {
          for (const d of (b as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { approved: 0, supplied: 0 };
            agg.supplied += Number(d.quantity_supplies || 0);
            summary.set(key, agg);
          }
        }

        // Tính remaining dựa vào quantity_approve
        for (const [key, agg] of summary.entries()) {
          remainingMap.set(key, Math.max(agg.approved - agg.supplied, 0));
        }
      }
    } else {
      // Nếu chưa có repair_request pending, không có vật tư nào yêu cầu
      remainingMap = new Map();
    }

    const missingMaterialIds = Array.from(remainingMap.entries())
      .filter(([, remaining]) => remaining > 0)
      .map(([id]) => id);

    let materialById: Record<string, any> = {};
    if (missingMaterialIds.length > 0) {
      const materials = await this.userRepo.manager
        .getRepository('Material')
        .find({ where: { id: In(missingMaterialIds) } });

      materialById = materials.reduce((acc: any, m: any) => {
        acc[m.id] = {
          id: m.id,
          code: m.code,
          name: m.name,
          unit: m.unit,
        };
        return acc;
      }, {});
    }

    // ✅ FIX: Chỉ coi vật tư đã cấp đủ nếu:
    // 1. Có repair_request hiện tại
    // 2. Tất cả vật tư trong repair_request đó đã cấp đủ (remaining = 0)
    // Nếu chưa có repair_request → allSupplied = false (có thể tạo phiếu mới)
    const allSupplied =
      currentRepair !== null &&
      (remainingMap.size === 0 ||
        Array.from(remainingMap.values()).every(
          (remaining) => remaining === 0,
        ));

    const allSuppliedMessage = allSupplied
      ? 'Tất cả vật tư đã cấp đủ cho thiết bị này, không cần tạo phiếu mới.'
      : undefined;

    const message = hasConflict
      ? `Thiết bị này đang sửa chữa. Bạn muốn tạo thêm phiếu xin cấp vật tư?`
      : null;

    if (forbidCreate) {
      return {
        forbidCreate,
        forbidMessage,
      };
    }

    return {
      conflict: hasConflict,
      message,
      equipment: equipment
        ? { code: (equipment as any).code, name: (equipment as any).name }
        : null,
      previous_ballot: filtered_ballot,
      suggested_details: suggestedDetails,
      allSupplied,
      allSuppliedMessage,
    };
  }

  async approve(
    id: string,
    approverUserId?: string,
    dto?: ApproveMaterialSupplyBallotDto,
  ): Promise<MaterialSupplyBallotListItemDto> {
    const msb = await this.msbRepo.findOne({
      where: { id: id as any },
      relations: ['details'],
    });
    if (!msb)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    if (msb.status === 'in_progress') return this.toDto(msb);
    if (msb.status === 'rejected')
      throw new BadRequestException({
        errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: 'Phiếu đã bị từ chối, không thể duyệt',
      });

    // Tối ưu: Lấy equipment với relations ngay từ đầu để dùng lại
    let equipment: Equipment | null = null;
    if ((msb as any).equipment_id) {
      equipment = await this.equipmentRepo.findOne({
        where: { id: (msb as any).equipment_id },
        relations: ['department'],
      });
    }

    // Nếu phiếu này chưa gán vào Yêu cầu sửa chữa nào thì tìm hoặc tạo mới RepairRequest
    if (!msb.repair_request_id) {
      if (!msb.equipment_id)
        throw new BadRequestException('Thiếu equipment_id ở phiếu');

      // Nếu thiết bị đang maintenance, tìm RepairRequest đang pending
      if (equipment && (equipment as any).status === 'maintenance') {
        const existingRepairReq = await this.repairRequestRepo.findOne({
          where: {
            equipment_id: (msb as any).equipment_id,
            status: 'pending' as any,
          },
          order: { start_date: 'DESC' as any },
        });

        if (existingRepairReq) {
          // Gán MSB vào RepairRequest hiện có
          msb.repair_request_id = (existingRepairReq as any).id;
        } else {
          // Nếu không tìm thấy, tạo mới RepairRequest
          const repairReq = this.repairRequestRepo.create({
            equipment_id: msb.equipment_id,
            start_date: new Date(),
            status: 'pending',
          });
          const savedRepairReq = await this.repairRequestRepo.save(repairReq);
          msb.repair_request_id = savedRepairReq.id;
        }
      } else {
        // Nếu thiết bị không trong maintenance, tạo mới RepairRequest
        const repairReq = this.repairRequestRepo.create({
          equipment_id: msb.equipment_id,
          start_date: new Date(),
          status: 'pending',
        });
        const savedRepairReq = await this.repairRequestRepo.save(repairReq);
        msb.repair_request_id = savedRepairReq.id;
      }
    }

    // Điều chỉnh cấp độ sửa chữa nếu truyền vào
    if (dto?.level_repair) msb.level_repair = dto.level_repair;
    // Điều chỉnh từng dòng
    if (dto?.details && Array.isArray(dto.details)) {
      const itemsMap = new Map(
        (((msb as any).details ?? []) as any[]).map((x: any) => [
          x.material_id,
          x,
        ]),
      );
      // Ràng buộc: không cho phép quantity_supplies vượt quá phần còn thiếu tích lũy (dựa vào quantity_approve)
      const remainingMap = await this.computeRemainingByMaterial(
        (msb as any).equipment_id,
      );
      dto.details.forEach((d) => {
        const item = itemsMap.get(d.material_id);
        if (!item) return;
        if (typeof d.quantity_request === 'number')
          item.quantity_request = d.quantity_request;
        if (typeof d.quantity_approve === 'number')
          item.quantity_approve = d.quantity_approve;
        if (typeof d.quantity_supplies === 'number') {
          const remainingAllowed = remainingMap.get(d.material_id) ?? Infinity;
          if (d.quantity_supplies > remainingAllowed) {
            throw new BadRequestException(
              `Số lượng thực cấp cho vật tư vượt quá phần còn thiếu (còn thiếu: ${remainingAllowed})`,
            );
          }
          item.quantity_supplies = d.quantity_supplies;
          // Cập nhật lại remaining tại chỗ để các dòng sau cùng material không vượt
          if (remainingAllowed !== Infinity) {
            remainingMap.set(
              d.material_id,
              Math.max(remainingAllowed - d.quantity_supplies, 0),
            );
          }
        }
        if (d.reason && ['Thay mới', 'Sửa chữa', 'Dùng lại'].includes(d.reason))
          item.reason = d.reason as 'Thay mới' | 'Sửa chữa' | 'Dùng lại';
        if (typeof d.notes === 'string') item.notes = d.notes;
      });
    }
    msb.status = 'in_progress' as any;
    if (approverUserId) (msb as any).transport_mechanic_id = approverUserId;
    if (approverUserId) (msb as any).updatedBy = approverUserId;

    // Tối ưu: Chạy song song các update độc lập
    const savePromises: Promise<any>[] = [this.msbRepo.save(msb)];

    if (msb.equipment_id) {
      savePromises.push(
        this.equipmentRepo.update(msb.equipment_id, {
          status: 'maintenance',
        }),
      );
    }

    // Hoàn thành work item 'approve_adjust' cho người duyệt (CĐVT)
    if (approverUserId) {
      savePromises.push(
        this.workItemService.completeByRef(
          approverUserId,
          'MSB',
          (msb as any).id,
          'approve_adjust',
        ),
      );
    }

    await Promise.all(savePromises);

    // Biên bản 01/02 sẽ được tạo khi Thủ kho ký (signAndAdjustSupplies), không tạo ở bước duyệt

    // ========== BƯỚC 2: Xác định Department Quản Lý và Sửa Chữa ==========
    let departmentManagerId: string | null = null;
    let departmentRepairId: string | null = null;

    // Tối ưu: Dùng lại equipment đã query ở trên
    if (equipment?.department_id) {
      departmentManagerId = equipment.department_id;

      // Xác định đơn vị sửa chữa dựa trên level_repair
      if (msb.level_repair === 'Sửa chữa' || msb.level_repair === 'Bảo dưỡng') {
        // Đơn vị quản lý = Đơn vị sửa chữa = phòng ban quản lý thiết bị
        departmentRepairId = equipment.department_id;
      } else if (
        msb.level_repair === 'Xưởng sửa chữa' ||
        msb.level_repair === 'Xưởng bảo dưỡng'
      ) {
        // Đơn vị sửa chữa = Phân xưởng 7
        const phanXuong7 = await this.departmentRepo.findOne({
          where: [
            { name: ILike('%phân xưởng 7%') },
            { name: ILike('%phan xuong 7%') },
            { name: ILike('%Phân Xưởng 7%') },
            { name: ILike('%phan xuong 7%') },
            { name: ILike('%PHÂN XƯỞNG 7%') },
            { name: ILike('%PHÂN XUONG 7%') },
            { code: ILike('%PX7%') },
            { code: ILike('%px7%') },
          ],
        });

        if (phanXuong7) {
          departmentRepairId = (phanXuong7 as any).id;
        } else {
          // Fallback: nếu không tìm thấy Phân xưởng 7, dùng department quản lý
          departmentRepairId = equipment.department_id;
        }
      }
    }

    // ========== BƯỚC 3: Tạo/Re-use AssignmentBallot (03/SCTX) =========
    let savedAssignmentBallot: AssignmentBallot | null = null;
    if (departmentManagerId && departmentRepairId && msb.repair_request_id) {
      // Tìm assignment ballot theo repair_request_id là duy nhất cho 1 lần sửa chữa
      const existingAsb = await this.assignmentBallotRepo.findOne({
        where: {
          repair_request_id: msb.repair_request_id,
          status: In(['pending' as any, 'in_progress' as any]) as any,
        } as any,
        order: { createdAt: 'DESC' as any },
      });

      if (existingAsb) {
        savedAssignmentBallot = existingAsb;
      } else {
        const assignmentBallot = this.assignmentBallotRepo.create({
          name: `Phiếu giao việc sửa chữa cho: ${msb.name}`,
          description: `Phiếu giao việc sửa chữa thiết bị - ${msb.name}`,
          equipment_id: (msb as any).equipment_id ?? null,
          department_manager_id: departmentManagerId,
          department_repair_id: departmentRepairId,
          repair_request_id: msb.repair_request_id, // thêm trường này khi tạo mới
          status: 'pending',
        } as Partial<AssignmentBallot>);
        (assignmentBallot as any).createdBy =
          approverUserId ?? (msb as any).createdBy ?? null;
        savedAssignmentBallot =
          await this.assignmentBallotRepo.save(assignmentBallot);

        if ((msb as any).equipment_id && savedAssignmentBallot) {
          try {
            await this.historyRepairService.addBallotToHistory(
              (msb as any).equipment_id,
              'ASB',
              (savedAssignmentBallot as any).id,
            );
          } catch (err) {
            console.warn(
              'history-repair add failed for ASB create',
              err?.message || err,
            );
          }
        }
        if ((msb as any).repair_request_id && savedAssignmentBallot) {
          try {
            await this.historyRepairService.addBallotToRepairRequest(
              (msb as any).repair_request_id,
              'ASB',
              (savedAssignmentBallot as any).id,
            );
          } catch (err) {
            console.warn(
              'addBallotToRepairRequest failed for ASB create',
              err?.message || err,
            );
          }
        }
      }
    }

    // (BỎ) KHÔNG tạo work item ký 01/02 SCTX cho QLTB hoặc CĐVT ở bước approve
    // (BỎ) KHÔNG tạo work item cho Phó giám đốc ở bước approve - sẽ tạo sau khi Thủ kho ký

    // Tối ưu: Tạo work item cho Thủ kho - Ký (BẮT BUỘC) khi phiếu được duyệt
    const createdBy = approverUserId ?? (msb as any).createdBy ?? 'system';
    if ((msb as any).lead_warehouse_id) {
      await this.workItemRepo.save(
        this.workItemRepo.create({
          user_id: (msb as any).lead_warehouse_id,
          ref_type: 'MSB',
          ref_id: (msb as any).id,
          task_type: 'sign',
          task_name: 'Ký Phiếu xin cấp vật tư',
          ballot_name: msb.name,
          start_date: new Date(),
          status: 'pending',
          createdBy,
        }),
      );
    } else {
      const thuKhoPositions = await this.positionRepo.find({
        where: [
          { code: ILike('%TK%') },
          { name: ILike('%thủ kho%') },
          { name: ILike('%kho%') },
        ],
      });

      if (thuKhoPositions.length > 0) {
        const thuKhoUsers = await this.userRepo.find({
          where: {
            position_id: In(thuKhoPositions.map((p: any) => p.id)),
            status: 'active',
          },
        });
        // Chỉ giao cho duy nhất 1 Thủ kho (nếu có nhiều, chọn người đầu tiên)
        const thuKhoUser = thuKhoUsers?.[0];
        if (thuKhoUser) {
          await this.workItemRepo.save(
            this.workItemRepo.create({
              user_id: (thuKhoUser as any).id,
              ref_type: 'MSB',
              ref_id: (msb as any).id,
              task_type: 'sign',
              task_name: 'Ký Phiếu xin cấp vật tư',
              ballot_name: msb.name,
              start_date: new Date(),
              status: 'pending',
              createdBy,
            }),
          );
        }
      }
    }

    // ========== TẠO WORK ITEM CHO NHỮNG NGƯỜI ĐÃ KÝ MSB CŨ ĐỂ KÝ MSB MỚI ==========
    // Khi approve MSB mới trong cùng repair_request, những người đã ký MSB cũ (trong cùng repair_request) cần ký lại MSB mới
    if ((msb as any).repair_request_id) {
      // Tìm tất cả MSB cũ trong CÙNG repair_request (trừ MSB hiện tại)
      // Đảm bảo chỉ lấy MSB cũ nằm trong cùng một yêu cầu sửa chữa
      const otherMsbs = await this.msbRepo.find({
        where: {
          repair_request_id: (msb as any).repair_request_id,
          id: Not((msb as any).id),
        },
      });

      // Tập hợp những người đã ký từ các MSB cũ (chỉ trong cùng repair_request)
      const signedUsers = new Set<string>();
      for (const otherMsb of otherMsbs) {
        // Chỉ lấy người đã ký từ MSB cũ nếu MSB cũ đó có cùng repair_request_id
        if (
          (otherMsb as any).repair_request_id === (msb as any).repair_request_id
        ) {
          // Lấy những người đã ký từ MSB cũ
          if ((otherMsb as any).lead_warehouse_id) {
            signedUsers.add((otherMsb as any).lead_warehouse_id);
          }
          if ((otherMsb as any).receiver_id) {
            signedUsers.add((otherMsb as any).receiver_id);
          }
          if ((otherMsb as any).deputy_foreman_id) {
            signedUsers.add((otherMsb as any).deputy_foreman_id);
          }
          if ((otherMsb as any).transport_mechanic_id) {
            signedUsers.add((otherMsb as any).transport_mechanic_id);
          }
        }
      }

      // Tạo work item cho những người đã ký MSB cũ để ký MSB mới
      if (signedUsers.size > 0) {
        // Kiểm tra xem đã có work item cho MSB mới chưa để tránh tạo trùng
        const existingWorkItems = await this.workItemRepo.find({
          where: {
            ref_type: 'MSB',
            ref_id: (msb as any).id,
            task_type: 'sign',
          },
        });
        const existingUserIds = new Set(
          existingWorkItems.map((item) => item.user_id),
        );

        const workItemsToCreate: any[] = [];
        for (const userId of signedUsers) {
          // Không tạo work item nếu user này đã ký trên chính MSB này!
          if (
            userId === (msb as any).lead_warehouse_id ||
            userId === (msb as any).receiver_id ||
            userId === (msb as any).deputy_foreman_id ||
            userId === (msb as any).transport_mechanic_id
          ) {
            continue;
          }
          // Chỉ tạo work item nếu user này chưa có work item cho MSB mới
          if (!existingUserIds.has(userId)) {
            workItemsToCreate.push(
              this.workItemRepo.create({
                user_id: userId,
                ref_type: 'MSB',
                ref_id: (msb as any).id,
                task_type: 'sign',
                task_name: 'Ký Phiếu xin cấp vật tư',
                ballot_name: msb.name,
                start_date: new Date(),
                status: 'pending',
                createdBy,
              }),
            );
          }
        }

        if (workItemsToCreate.length > 0) {
          await this.workItemRepo.save(workItemsToCreate);
        }
      }
    }

    return this.toDto(msb);
  }

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done';
      sortBy?: 'createdAt' | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<MaterialSupplyBallotListItemDto>> {
    const qb = this.msbRepo.createQueryBuilder('msb');
    if (filters?.status) {
      qb.andWhere('msb.status = :status', { status: filters.status });
    }
    if (filters?.search) {
      qb.andWhere(
        '(LOWER(msb.name) LIKE LOWER(:search) OR LOWER(msb.technical_status) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }
    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`msb.${sortField}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((i) => this.toDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findDrafts(page = 1, limit = 20, filters?: any) {
    const qb = this.msbRepo
      .createQueryBuilder('msb')
      .leftJoinAndSelect('msb.equipment', 'equipment');

    qb.andWhere('msb.status = :status', { status: 'draft' });

    if (filters?.search) {
      qb.andWhere(
        '(LOWER(msb.name) LIKE LOWER(:search) OR LOWER(equipment.name) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.userId) {
      qb.andWhere('msb.createdBy = :userId', { userId: filters.userId });
    }

    const sortField = filters?.sortBy || 'createdAt';
    const sortOrder =
      (filters?.sortOrder?.toUpperCase?.() as 'ASC' | 'DESC') || 'DESC';

    qb.orderBy(`msb.${sortField}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const data = items.map((item) => ({
      id: item.id,
      name: item.name,
      equipment: item.equipment
        ? {
            code: item.equipment.code,
            name: item.equipment.name,
          }
        : null,
      lead_warehouse_id: item.lead_warehouse_id,
      receiver_id: item.receiver_id,
      transport_mechanic_id: item.transport_mechanic_id,
      deputy_foreman_id: item.deputy_foreman_id,
      status: item.status,
      notes: item.notes,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return {
      items: data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByCreator(
    userId: string,
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'draft' | 'pending' | 'in_progress' | 'rejected' | 'done';
      sortBy?: 'createdAt' | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<any>> {
    const qb = this.msbRepo
      .createQueryBuilder('msb')
      .leftJoinAndSelect('msb.equipment', 'equipment')
      .where('msb.createdBy = :userId', { userId });

    if (filters?.status) {
      qb.andWhere('msb.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      qb.andWhere(
        '(LOWER(msb.name) LIKE LOWER(:search) OR LOWER(equipment.name) LIKE LOWER(:search))',
        { search: `%${filters.search}%` },
      );
    }

    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`msb.${sortField}`, sortOrder);

    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((i) => this.toMyBallotDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toMyBallotDto(msb: MaterialSupplyBallot): any {
    return {
      id: (msb as any).id,
      name: msb.name,
      equipment: msb.equipment
        ? {
            id: msb.equipment.id,
            code: msb.equipment.code,
            name: msb.equipment.name,
          }
        : null,
      level_repair: msb.level_repair ?? null,
      status: msb.status,
      notes: msb.notes ?? null,
      createdAt: (msb as any).createdAt ?? null,
      updatedAt: (msb as any).updatedAt ?? null,
    };
  }

  async updateDraft(
    id: string,
    dto: CreateMaterialSupplyBallotWithDetailsDto,
    userId: string,
  ): Promise<MaterialSupplyBallotListItemDto> {
    const msb = await this.msbRepo.findOne({
      where: { id },
      relations: ['details'],
    });

    if (!msb) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    if (msb.createdBy !== userId) {
      throw new BadRequestException({
        errCode: ERROR_CODES.FORBIDDEN,
        message: 'Bạn không có quyền sửa phiếu này!',
      });
    }

    // Chỉ cho phép sửa khi đang ở draft hoặc pending nhưng do creator
    if (!['draft', 'pending'].includes(msb.status)) {
      throw new BadRequestException({
        errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
        message:
          'Chỉ có thể sửa phiếu ở trạng thái bản nháp hoặc đang chờ duyệt!',
      });
    }

    const { details, status, ...header } = dto;

    Object.assign(msb, {
      ...header,
      status: status || msb.status,
      updatedBy: userId,
    });

    // Xóa details cũ (dùng remove để cascade hoạt động)
    if (msb.details?.length) {
      await this.msbDetailRepo.remove(msb.details);
      msb.details = [];
    }

    // Tạo details mới
    if (details && details.length > 0) {
      const newDetailEntities = details.map((item) =>
        this.msbDetailRepo.create({
          ...item,
          materialSupplyBallot: msb,
          createdBy: userId,
        }),
      );
      const savedDetails = await this.msbDetailRepo.save(newDetailEntities);
      msb.details = savedDetails;
    }

    const saved = await this.msbRepo.save(msb);

    const full = await this.msbRepo.findOne({
      where: { id: saved.id },
      relations: ['details', 'equipment'],
    });

    return this.toDto(full);
  }

  async deleteDraft(id: string) {
    const msb = await this.msbRepo.findOne({ where: { id: id as any } });
    if (!msb) throw new NotFoundException('Không tìm thấy phiếu');
    if (msb.status !== 'draft') {
      throw new BadRequestException(
        'Chỉ phiếu đang ở trạng thái bản nháp (draft) mới được xoá!',
      );
    }
    await this.msbRepo.delete({ id: id as any });
    return { success: true };
  }

  async findByEquipmentId(
    equipment_id: string,
    page = 1,
    limit = 100,
  ): Promise<PaginatedResponse<MaterialSupplyBallotListItemDto>> {
    const qb = this.msbRepo.createQueryBuilder('msb');
    qb.where('msb.equipment_id = :equipment_id', { equipment_id });
    qb.orderBy('msb.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((i) => this.toDto(i)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findDetail(id: string): Promise<any> {
    const msb = await this.msbRepo.findOne({
      where: { id: id as any },
      relations: [
        'equipment',
        'leadWarehouse',
        'receiver',
        'transportMechanic',
        'deputyForeman',
        'technicalAppraisalBallot',
        'detailAppraisalBallot',
        'details',
        'details.material',
      ],
    });
    if (!msb)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    // Bổ sung dữ liệu user nếu quan hệ chưa được hydrate nhưng có *_id
    const missingUserIds: string[] = [];
    const leadWarehouseId = (msb as any).lead_warehouse_id;
    const receiverId = (msb as any).receiver_id;
    const transportMechanicId = (msb as any).transport_mechanic_id;
    const deputyForemanId = (msb as any).deputy_foreman_id;
    const equipmentManagerId = (msb as any).equipment_manager_id;
    if (!(msb as any).leadWarehouse && leadWarehouseId)
      missingUserIds.push(leadWarehouseId);
    if (!(msb as any).receiver && receiverId) missingUserIds.push(receiverId);
    if (!(msb as any).transportMechanic && transportMechanicId)
      missingUserIds.push(transportMechanicId);
    if (!(msb as any).deputyForeman && deputyForemanId)
      missingUserIds.push(deputyForemanId);
    if (!(msb as any).equipmentManager && equipmentManagerId)
      missingUserIds.push(equipmentManagerId);
    let userById: Record<string, any> = {};
    if (missingUserIds.length > 0) {
      const users = await this.userRepo.find({
        where: { id: In(missingUserIds) },
      });
      userById = users.reduce(
        (acc: any, u: any) => {
          acc[u.id] = u;
          return acc;
        },
        {} as Record<string, any>,
      );
    }

    let assignedUserIds: string[] = [];
    if ((msb as any).id) {
      assignedUserIds = await this.workItemService.findAllUsersByRef(
        'MSB',
        (msb as any).id,
      );
    }

    const pickUser = (u?: any) =>
      u
        ? {
            id: u.id ?? null,
            firstname: u.firstname ?? null,
            lastname: u.lastname ?? null,
          }
        : null;
    const pickEquipment = (e?: any) =>
      e
        ? {
            id: e.id ?? null,
            code: e.code ?? null,
            name: e.name ?? null,
          }
        : null;

    const pickMaterial = (m?: any) =>
      m
        ? {
            id: m.id,
            code: m.code ?? null,
            name: m.name ?? null,
            unit: m.unit ?? null,
          }
        : null;

    return {
      id: (msb as any).id,
      name: (msb as any).name,
      equipment: pickEquipment((msb as any).equipment),
      equipment_manager_id: equipmentManagerId ?? null,
      level_repair: (msb as any).level_repair ?? null,
      technical_status: (msb as any).technical_status ?? null,
      reason: (msb as any).reason ?? null,
      solution: (msb as any).solution ?? null,
      lead_warehouse: pickUser(
        (msb as any).leadWarehouse ||
          (leadWarehouseId && userById[leadWarehouseId]),
      ),
      receiver: pickUser(
        (msb as any).receiver || (receiverId && userById[receiverId]),
      ),
      transport_mechanic: pickUser(
        (msb as any).transportMechanic ||
          (transportMechanicId && userById[transportMechanicId]),
      ),
      deputy_foreman: pickUser(
        (msb as any).deputyForeman ||
          (deputyForemanId && userById[deputyForemanId]),
      ),
      status: (msb as any).status,
      notes: (msb as any).notes ?? null,
      createdAt: (msb as any).createdAt ?? null,
      details:
        ((msb as any).details ?? []).map((i: any) => ({
          id: (i as any).id,
          material: pickMaterial(i.material),
          quantity_request: i.quantity_request ?? null,
          quantity_approve: i.quantity_approve ?? null,
          quantity_supplies: i.quantity_supplies ?? null,
          reason: i.reason ?? null,
          notes: i.notes ?? null,
        })) ?? [],
      assignedUserIds,
    };
  }

  async reject(
    id: string,
    rejectorUserId: string,
  ): Promise<MaterialSupplyBallotListItemDto> {
    const msb = await this.msbRepo.findOne({ where: { id: id as any } });
    if (!msb)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });

    if ((msb as any).status === 'rejected') return this.toDto(msb);
    if ((msb as any).status === 'done')
      throw new BadRequestException({
        errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
        message: 'Phiếu đã hoàn tất, không thể từ chối',
      });

    (msb as any).status = 'rejected';
    (msb as any).updatedBy = rejectorUserId;
    await this.msbRepo.save(msb);

    // Xóa toàn bộ workitems liên quan đến MSB này (mọi task_type)
    await this.workItemService.deleteWorkItemForRef('MSB', id);

    // Dọn dẹp an toàn nếu trước đó đã từng sinh TAB/DAB (trong các phiên bản trước)
    if ((msb as any).technical_appraisal_ballot_id) {
      await this.workItemService.deleteWorkItemForRef(
        'TAB',
        (msb as any).technical_appraisal_ballot_id,
      );
    }
    if ((msb as any).detail_appraisal_ballot_id) {
      await this.workItemService.deleteWorkItemForRef(
        'DAB',
        (msb as any).detail_appraisal_ballot_id,
      );
    }

    return this.toDto(msb);
  }

  private toDto(e: MaterialSupplyBallot): MaterialSupplyBallotListItemDto {
    return {
      id: (e as any).id,
      name: (e as any).name,
      equipment_id: (e as any).equipment_id ?? null,
      lead_warehouse_id: (e as any).lead_warehouse_id ?? null,
      receiver_id: (e as any).receiver_id ?? null,
      transport_mechanic_id: (e as any).transport_mechanic_id ?? null,
      deputy_foreman_id: (e as any).deputy_foreman_id ?? null,
      status: (e as any).status,
      notes: (e as any).notes ?? null,
      createdAt: (e as any).createdAt ?? null,
      updatedAt: (e as any).updatedAt ?? null,
    };
  }

  async sign(id: string, user: any): Promise<MaterialSupplyBallotListItemDto> {
    const msb = await this.msbRepo.findOne({
      where: { id: id as any },
      relations: ['details'],
    });
    let userWithPosition = user;
    if (!user.position) {
      userWithPosition = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['position'],
      });
    }
    if (!msb) throw new NotFoundException('Không tìm thấy phiếu');
    const positionCode = (
      userWithPosition.position?.code ??
      userWithPosition.position_code ??
      ''
    ).toLowerCase();

    const field = positionSignMapMSB[positionCode];
    if (!field || !(field in msb)) {
      throw new BadRequestException(
        'Bạn không được phép ký mục nào trên phiếu này!',
      );
    }
    if (msb[field]) throw new BadRequestException('Mục này đã có người ký!');
    (msb as any)[field] = user.id;
    msb.updatedBy = user.id;

    // Kiểm tra xem đã đủ 4 người ký chưa
    const hasLeadWarehouse = !!(msb as any).lead_warehouse_id;
    const hasReceiver = !!(msb as any).receiver_id;
    const hasDeputyForeman = !!(msb as any).deputy_foreman_id;
    const hasTransportMechanic = !!(msb as any).transport_mechanic_id;

    // Nếu đủ 4 người ký thì chuyển status sang 'done'
    if (
      hasLeadWarehouse &&
      hasReceiver &&
      hasDeputyForeman &&
      hasTransportMechanic
    ) {
      msb.status = 'done' as any;
    }

    await this.msbRepo.save(msb);

    await this.workItemService.completeByRef(user.id, 'MSB', id, 'sign');

    // Kiểm tra xem đã đủ 4 người ký VÀ đủ vật tư để tạo phiếu 04 (ARB)
    const isAllSigned =
      hasLeadWarehouse &&
      hasReceiver &&
      hasDeputyForeman &&
      hasTransportMechanic;

    if (isAllSigned && (msb as any).equipment_id) {
      // Kiểm tra xem tất cả vật tư từ TẤT CẢ các phiếu xin cấp vật tư trong cùng repair_request đã cấp đủ chưa
      let remainingMap = new Map<string, number>();
      let allMsbsInRequest: any[] = [];
      let allMsbsInRequestSigned = true;

      if ((msb as any).repair_request_id) {
        // Lấy tất cả MSB trong cùng repair_request (kèm details để tính vật tư), sắp xếp theo createdAt
        allMsbsInRequest = await this.msbRepo.find({
          where: {
            repair_request_id: (msb as any).repair_request_id,
          },
          relations: ['details'],
          order: { createdAt: 'ASC' as any },
        });

        // Tính tổng vật tư: requested chỉ tính từ MSB đầu tiên, supplied tính từ TẤT CẢ MSB
        const summary = new Map<
          string,
          { requested: number; supplied: number }
        >();

        // Lấy MSB đầu tiên (theo createdAt ASC) để tính requested ban đầu
        const firstMsb = allMsbsInRequest[0];

        // Tính requested chỉ từ MSB đầu tiên
        if (firstMsb) {
          for (const d of (firstMsb as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { requested: 0, supplied: 0 };
            agg.requested = Number(d.quantity_approve || 0); // Chỉ lấy từ MSB đầu tiên
            summary.set(key, agg);
          }
        }

        // Tính supplied từ TẤT CẢ MSB trong repair_request
        for (const b of allMsbsInRequest) {
          // Kiểm tra chữ ký
          const hasAllSignatures =
            !!(b as any).lead_warehouse_id &&
            !!(b as any).receiver_id &&
            !!(b as any).deputy_foreman_id &&
            !!(b as any).transport_mechanic_id;

          if (!hasAllSignatures) {
            allMsbsInRequestSigned = false;
          }

          // Tính supplied từ tất cả MSB
          for (const d of (b as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { requested: 0, supplied: 0 };
            agg.supplied += Number(d.quantity_supplies || 0); // Cộng dồn từ tất cả MSB
            summary.set(key, agg);
          }
        }

        // Tính remaining = requested (từ MSB đầu tiên) - supplied (từ tất cả MSB)
        // Chỉ tính remaining cho các material có trong MSB đầu tiên
        for (const [key, agg] of summary.entries()) {
          // Chỉ tính remaining nếu material này có trong MSB đầu tiên (requested > 0)
          if (agg.requested > 0) {
            remainingMap.set(key, Math.max(agg.requested - agg.supplied, 0));
          }
        }
      } else {
        // Nếu không có repair_request_id, tính tất cả MSB của thiết bị
        remainingMap = await this.computeRemainingByMaterial(
          (msb as any).equipment_id,
        );
      }

      // Nếu không còn vật tư nào thiếu (tất cả remaining = 0)
      const allMaterialsSupplied =
        remainingMap.size === 0 ||
        Array.from(remainingMap.values()).every((remaining) => remaining === 0);

      if (allMaterialsSupplied && allMsbsInRequestSigned) {
        // Kiểm tra và tạo work item cho PCĐVT để tạo phiếu nghiệm thu chạy thử sau sửa chữa
        if ((msb as any).equipment_id) {
          await this.repairWorkflowService.checkAndCreateWorkItemForARB(
            (msb as any).equipment_id,
            user.id,
          );
        }

        // Tìm AssignmentBallot liên quan (phiếu 03) theo equipment_id
        const assignmentBallot = await this.assignmentBallotRepo.findOne({
          where: {
            equipment_id: (msb as any).equipment_id,
            status: In(['pending' as any, 'in_progress' as any]) as any,
          },
          order: { createdAt: 'DESC' as any },
        });

        if (assignmentBallot) {
          // Kiểm tra xem ARB đã tồn tại chưa để tránh tạo trùng
          const existingARB = await this.acceptanceRepairBallotRepo.findOne({
            where: {
              equipment_id: (msb as any).equipment_id,
              status: In(['pending' as any, 'done' as any]) as any,
            },
            order: { createdAt: 'DESC' as any },
          });

          if (!existingARB) {
            // Cập nhật status của AssignmentBallot sang 'done'
            (assignmentBallot as any).status = 'done';
            await this.assignmentBallotRepo.save(assignmentBallot);

            // Tạo AcceptanceRepairBallot (phiếu 04)
            const acceptanceRepair = this.acceptanceRepairBallotRepo.create({
              name: `BIÊN BẢN NGHIỆM THU CHẠY THỬ VÀ BÀN GIAO THIẾT BỊ SAU SỬA CHỮA - ${msb.name}`,
              equipment_id: (msb as any).equipment_id,
              status: 'pending',
            } as Partial<AcceptanceRepairBallot>);
            (acceptanceRepair as any).createdBy = user.id;
            const savedAcceptanceRepair =
              await this.acceptanceRepairBallotRepo.save(acceptanceRepair);

            // Lấy những người đã ký phiếu 01 (TAB) và 02 (DAB) trong cùng repair_request để ký phiếu 04
            const signersForARB = new Set<string>();

            if ((msb as any).repair_request_id) {
              // Tìm tất cả MSB trong cùng repair_request
              const allMsbsForARB = await this.msbRepo.find({
                where: {
                  repair_request_id: (msb as any).repair_request_id,
                },
                relations: [
                  'technicalAppraisalBallot',
                  'detailAppraisalBallot',
                ],
              });

              let tab: any = null;
              let dab: any = null;

              for (const msbItem of allMsbsForARB) {
                if ((msbItem as any).technical_appraisal_ballot_id && !tab) {
                  tab = await this.tabRepo.findOne({
                    where: {
                      id: (msbItem as any).technical_appraisal_ballot_id,
                    },
                  });
                }
                if ((msbItem as any).detail_appraisal_ballot_id && !dab) {
                  dab = await this.dabRepo.findOne({
                    where: { id: (msbItem as any).detail_appraisal_ballot_id },
                  });
                }
                if (tab && dab) break;
              }

              // Lấy những người đã ký TAB (phiếu 01)
              if (tab) {
                if ((tab as any).operator_id) {
                  signersForARB.add((tab as any).operator_id);
                }
                if ((tab as any).equipment_manager_id) {
                  signersForARB.add((tab as any).equipment_manager_id);
                }
                if ((tab as any).repairman_id) {
                  signersForARB.add((tab as any).repairman_id);
                }
                if ((tab as any).transport_mechanic_id) {
                  signersForARB.add((tab as any).transport_mechanic_id);
                }
              }

              // Lấy những người đã ký DAB (phiếu 02)
              if (dab) {
                if ((dab as any).operator_id) {
                  signersForARB.add((dab as any).operator_id);
                }
                if ((dab as any).equipment_manager_id) {
                  signersForARB.add((dab as any).equipment_manager_id);
                }
                if ((dab as any).repairman_id) {
                  signersForARB.add((dab as any).repairman_id);
                }
                if ((dab as any).transport_mechanic_id) {
                  signersForARB.add((dab as any).transport_mechanic_id);
                }
              }
            }

            // Tạo work item cho những người đã ký TAB/DAB để ký phiếu 04
            // ĐÃ BỎ ĐOẠN NÀY THEO YÊU CẦU!
            // (Các work item liên quan TAB/DAB ký ARB không còn được tự động tạo ở đây)
          } else {
            (assignmentBallot as any).status = 'done';
            await this.assignmentBallotRepo.save(assignmentBallot);
          }
        }
      }
    }

    return this.toDto(msb);
  }

  async listRepairRequests(page = 1, limit = 20) {
    const qb = this.repairRequestRepo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.equipment', 'equipment')
      .leftJoinAndSelect('rr.materialSupplyBallots', 'ballots');
    qb.orderBy('rr.start_date', 'DESC');
    qb.skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async signAndAdjustSupplies(
    id: string,
    dto: any,
    user: any,
  ): Promise<MaterialSupplyBallotListItemDto> {
    const msb = await this.msbRepo.findOne({
      where: { id: id as any },
      relations: ['details'],
    });

    if (!msb) throw new NotFoundException('Không tìm thấy phiếu');

    // Lấy position của user
    let userWithPosition = user;
    if (!user.position) {
      userWithPosition = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['position'],
      });
    }

    const positionCode = (
      userWithPosition.position?.code ??
      userWithPosition.position_code ??
      ''
    ).toLowerCase();

    // Chỉ cho phép Thủ kho  điều chỉnh supplies
    if (positionCode !== 'tk' && positionCode !== 'TK') {
      throw new BadRequestException(
        'Chỉ Thủ kho mới có quyền điều chỉnh số lượng thực cấp',
      );
    }

    // Kiểm tra xem Thủ kho đã ký chưa
    if (msb.lead_warehouse_id && msb.lead_warehouse_id !== user.id) {
      throw new BadRequestException('Thủ kho đã ký phiếu này rồi');
    }

    if (dto.details && Array.isArray(dto.details)) {
      const itemsMap = new Map(
        (((msb as any).details ?? []) as any[]).map((x: any) => [
          x.material_id,
          x,
        ]),
      );

      dto.details.forEach((d) => {
        const item = itemsMap.get(d.material_id);
        if (!item) return;

        if (typeof d.quantity_approve === 'number') {
          item.quantity_approve = d.quantity_approve;
        }

        if (typeof d.quantity_supplies === 'number') {
          if (
            typeof item.quantity_approve === 'number' &&
            d.quantity_supplies > item.quantity_approve
          ) {
            throw new BadRequestException(
              'Số lượng thực cấp không được vượt quá số lượng phê duyệt',
            );
          }
          item.quantity_supplies = d.quantity_supplies;
        }
      });
    }

    // ===== 2. Ký phiếu (gán lead_warehouse_id) =====
    msb.lead_warehouse_id = user.id;
    msb.updatedBy = user.id;

    // Kiểm tra xem đã đủ 4 người ký chưa
    const hasLeadWarehouse = true; // Vừa ký
    const hasReceiver = !!(msb as any).receiver_id;
    const hasDeputyForeman = !!(msb as any).deputy_foreman_id;
    const hasTransportMechanic = !!(msb as any).transport_mechanic_id;

    // Nếu đủ 4 người ký thì chuyển status sang 'done'
    if (
      hasLeadWarehouse &&
      hasReceiver &&
      hasDeputyForeman &&
      hasTransportMechanic
    ) {
      msb.status = 'done' as any;
    }

    // ========== TẠO/UPDATE BIÊN BẢN 01/02 SCTX KHI THỦ KHO KÝ ==========
    let sharedTAB = null;
    let sharedDAB = null;
    let isNewTAB = false;
    let isNewDAB = false;

    if ((msb as any).repair_request_id) {
      // Tìm tất cả MSB cùng repair_request_id để check xem đã có TAB/DAB chưa
      const allBallotsSameRequest = await this.msbRepo.find({
        where: {
          repair_request_id: (msb as any).repair_request_id,
        },
        order: { createdAt: 'ASC' as any },
      });

      // Tìm MSB đầu tiên đã có TAB/DAB
      for (const b of allBallotsSameRequest) {
        if (
          (b as any).technical_appraisal_ballot_id &&
          (b as any).detail_appraisal_ballot_id
        ) {
          sharedTAB = (b as any).technical_appraisal_ballot_id;
          sharedDAB = (b as any).detail_appraisal_ballot_id;
          break;
        }
      }
    }

    if (sharedTAB && sharedDAB) {
      // Nếu đã có TAB/DAB, gán vào biên bản hiện tại và update chúng
      (msb as any).technical_appraisal_ballot_id = sharedTAB;
      (msb as any).detail_appraisal_ballot_id = sharedDAB;

      // Lấy details từ tất cả biên bản trong cùng repair_request
      const ballotsSameRequest = await this.msbRepo.find({
        where: { repair_request_id: (msb as any).repair_request_id },
        relations: ['details'],
        order: { createdAt: 'DESC' as any },
      });

      // Update TAB với thông tin từ MSB mới nhất
      const latestMsb = ballotsSameRequest[0];
      if (latestMsb) {
        await this.tabRepo.update(sharedTAB, {
          technical_status: (latestMsb as any).technical_status ?? null,
          reason: (latestMsb as any).reason ?? null,
          solution: (latestMsb as any).solution ?? null,
          updatedAt: new Date(),
        });
      }

      // Update DAB items
      const existingDab = await this.dabRepo.findOne({
        where: { id: sharedDAB },
        relations: ['items'],
      });

      const itemsByMaterialId = new Map<string, DetailAppraisalBallotItem>();
      if (existingDab && existingDab.items) {
        for (const item of existingDab.items) {
          if (item.material_id) {
            itemsByMaterialId.set(item.material_id, item);
          }
        }
      }

      const itemsToSave: DetailAppraisalBallotItem[] = [];
      for (const b of ballotsSameRequest) {
        for (const d of (b as any).details ?? []) {
          if (!d.material_id) continue;

          let treatment_measure: 'Thay mới' | 'Sửa chữa' | 'Dùng lại' | null =
            null;
          const reason = d.reason?.trim();
          let technical_status: 'Hư hỏng' | 'Cần phục hồi' | 'Đảm bảo' | null =
            null;

          if (reason === 'Thay mới') {
            treatment_measure = 'Thay mới';
            technical_status = 'Hư hỏng';
          } else if (reason === 'Sửa chữa') {
            treatment_measure = 'Sửa chữa';
            technical_status = 'Cần phục hồi';
          } else if (reason === 'Dùng lại') {
            treatment_measure = 'Dùng lại';
            technical_status = 'Đảm bảo';
          }

          const existingItem = itemsByMaterialId.get(d.material_id);
          if (existingItem) {
            existingItem.quantity = d.quantity_approve ?? existingItem.quantity;
            existingItem.treatment_measure =
              treatment_measure ?? existingItem.treatment_measure;
            existingItem.technical_status =
              technical_status ?? existingItem.technical_status;
            existingItem.notes_suggest = d.notes ?? existingItem.notes_suggest;
            itemsToSave.push(existingItem);
          } else {
            const newItem = this.dabItemRepo.create({
              detail_appraisal_ballot_id: sharedDAB,
              material_id: d.material_id,
              quantity: d.quantity_request ?? null,
              treatment_measure: treatment_measure,
              technical_status: technical_status,
              notes_suggest: d.notes ?? null,
              createdBy: (b as any).createdBy ?? null,
            });
            itemsToSave.push(newItem);
            itemsByMaterialId.set(d.material_id, newItem);
          }
        }
      }

      if (itemsToSave.length > 0) {
        await this.dabItemRepo.save(itemsToSave);
      }

      await this.dabRepo.update(sharedDAB, {
        updatedAt: new Date(),
      });
    } else {
      // Auto create 01/SCTX (TechnicalAppraisalBallot)
      const tab = this.tabRepo.create({
        name: `BIÊN BẢN GIÁM ĐỊNH KỸ THUẬT VÀ BÀN GIAO THIẾT BỊ VÀO SỬA CHỮA: ${msb.name}`,
        equipment_id: (msb as any).equipment_id ?? null,
        status: 'pending',
        technical_status: (msb as any).technical_status ?? null,
        reason: (msb as any).reason ?? null,
        solution: (msb as any).solution ?? null,
      } as Partial<TechnicalAppraisalBallot>);
      const savedTAB = await this.tabRepo.save(tab);
      isNewTAB = true;

      if ((msb as any).repair_request_id) {
        await this.historyRepairService.addBallotToRepairRequest(
          (msb as any).repair_request_id,
          'TAB',
          (savedTAB as any).id,
        );
      }

      // Auto create 02/SCTX (DetailAppraisalBallot)
      const dabItems: Partial<DetailAppraisalBallotItem>[] =
        (msb as any).details?.map((it: any) => {
          let treatment_measure: 'Thay mới' | 'Sửa chữa' | 'Dùng lại' | null =
            null;
          const reason = it.reason?.trim();
          let technical_status: 'Hư hỏng' | 'Cần phục hồi' | 'Đảm bảo' | null =
            null;

          if (reason === 'Thay mới') {
            treatment_measure = 'Thay mới';
            technical_status = 'Hư hỏng';
          } else if (reason === 'Sửa chữa') {
            treatment_measure = 'Sửa chữa';
            technical_status = 'Cần phục hồi';
          } else if (reason === 'Dùng lại') {
            treatment_measure = 'Dùng lại';
            technical_status = 'Đảm bảo';
          }

          return {
            material_id: it.material_id ?? null,
            quantity: it.quantity_approve ?? null,
            treatment_measure: treatment_measure,
            technical_status: technical_status,
            notes_suggest: it.notes ?? null,
            createdBy: (msb as any).createdBy ?? null,
          };
        }) ?? [];

      const dab = this.dabRepo.create({
        name: `BIÊN BẢN GIÁM ĐỊNH KỸ THUẬT CHI TIẾT: ${msb.name}`,
        equipment_id: (msb as any).equipment_id ?? null,
        status: 'pending',
        items: dabItems,
      } as Partial<DetailAppraisalBallot>);
      const savedDAB = await this.dabRepo.save(dab);
      isNewDAB = true;

      if ((msb as any).repair_request_id) {
        await this.historyRepairService.addBallotToRepairRequest(
          (msb as any).repair_request_id,
          'DAB',
          (savedDAB as any).id,
        );
      }

      (msb as any).technical_appraisal_ballot_id = (savedTAB as any).id;
      (msb as any).detail_appraisal_ballot_id = (savedDAB as any).id;
    }

    // ========== TẠO WORK ITEMS KÝ 01/02 SCTX KHI NÓ MỚI ĐƯỢC TẠO ==========
    const tabId = (msb as any).technical_appraisal_ballot_id as string;
    const dabId = (msb as any).detail_appraisal_ballot_id as string;

    if (isNewTAB || isNewDAB) {
      const existingWorkItems = await this.workItemRepo.find({
        where: [
          { ref_type: 'TAB', ref_id: tabId, task_type: 'sign' },
          { ref_type: 'DAB', ref_id: dabId, task_type: 'sign' },
        ],
      });

      const existingWorkItemsMap = new Map<string, Set<string>>();
      for (const item of existingWorkItems) {
        const key = item.ref_type;
        if (!existingWorkItemsMap.has(key)) {
          existingWorkItemsMap.set(key, new Set());
        }
        existingWorkItemsMap.get(key)!.add(item.user_id);
      }

      const workSignTargets: Array<{
        userId?: string;
        refType: 'TAB' | 'DAB';
        refId: string;
        taskName: string;
        ballotName: string;
      }> = [];
      const signUsers: Set<string> = new Set();
      const creatorId = (msb as any).createdBy as string | undefined;
      const equipmentManagerId = (msb as any).equipment_manager_id as
        | string
        | undefined;

      // Thêm people cần ký
      [creatorId, equipmentManagerId].forEach((userId) => {
        if (userId && !signUsers.has(userId)) {
          signUsers.add(userId);
          if (
            isNewTAB &&
            (!existingWorkItemsMap.has('TAB') ||
              !existingWorkItemsMap.get('TAB')?.has(userId))
          ) {
            workSignTargets.push({
              userId,
              refType: 'TAB',
              refId: tabId,
              taskName:
                'Ký biên bản giám định kỹ thuật và bàn giao thiết bị vào sửa chữa',
              ballotName: 'Biên bản giám định kỹ thuật',
            });
          }
          if (
            isNewDAB &&
            (!existingWorkItemsMap.has('DAB') ||
              !existingWorkItemsMap.get('DAB')?.has(userId))
          ) {
            workSignTargets.push({
              userId,
              refType: 'DAB',
              refId: dabId,
              taskName: 'Ký biên bản giám định kỹ thuật chi tiết',
              ballotName: 'Biên bản chi tiết giám định',
            });
          }
        }
      });

      if (workSignTargets.length > 0) {
        const workItemsToCreate = workSignTargets
          .filter((t) => t.userId)
          .map((t) =>
            this.workItemRepo.create({
              user_id: t.userId!,
              ref_type: t.refType,
              ref_id: t.refId,
              task_type: 'sign',
              task_name: t.taskName,
              ballot_name: t.ballotName,
              start_date: new Date(),
              status: 'pending',
              createdBy: user.id,
            }),
          );
        if (workItemsToCreate.length > 0) {
          await this.workItemRepo.save(workItemsToCreate);
        }
      }
    }

    await this.msbRepo.save(msb);

    // Complete work item cho Thủ kho
    await this.workItemService.completeByRef(user.id, 'MSB', id, 'sign');

    // ========== TẠO WORK ITEM CHO PHÓ GIÁM ĐỐC NGAY SAU KHI THỦ KHO KÝ ==========
    // Phó giám đốc cần ký AssignmentBallot (phiếu 03), không phụ thuộc vào việc MSB đã đủ 4 người ký chưa
    if ((msb as any).equipment_id) {
      const assignmentBallot = await this.assignmentBallotRepo.findOne({
        where: {
          equipment_id: (msb as any).equipment_id,
          status: In(['pending' as any, 'in_progress' as any]) as any,
        },
        order: { createdAt: 'DESC' as any },
      });

      if (assignmentBallot) {
        // Kiểm tra xem đã có work item cho PGD ký ASB này chưa
        const existingWorkItemsForASB = await this.workItemRepo.find({
          where: {
            ref_type: 'ASB',
            ref_id: (assignmentBallot as any).id,
            task_type: 'sign',
          },
        });

        // Chỉ tạo work item nếu chưa có work item nào cho ASB này
        if (existingWorkItemsForASB.length === 0) {
          // Tìm Phó giám đốc
          const phoGiamDocPosition = await this.positionRepo.findOne({
            where: {
              code: In([
                'giam_doc',
                'pho_giam_doc',
                'PGD',
                'PGĐ',
                'deputy_director',
              ]),
            },
          });

          if (phoGiamDocPosition) {
            // Tìm user Phó giám đốc
            const phoGiamDocUsers = await this.userRepo.find({
              where: {
                position_id: (phoGiamDocPosition as any).id,
                status: 'active',
              },
            });

            // Batch create work items cho Phó giám đốc
            if (phoGiamDocUsers.length > 0) {
              const workItems = phoGiamDocUsers.map((u) =>
                this.workItemRepo.create({
                  user_id: (u as any).id,
                  ref_type: 'ASB',
                  ref_id: (assignmentBallot as any).id,
                  task_type: 'sign',
                  task_name: 'Ký biên bản giao việc sửa chữa',
                  ballot_name: assignmentBallot.name,
                  start_date: new Date(),
                  status: 'pending',
                  createdBy: user.id,
                }),
              );
              await this.workItemRepo.save(workItems);
            }
          }
        }
      }
    }

    const isAllSigned =
      hasLeadWarehouse &&
      hasReceiver &&
      hasDeputyForeman &&
      hasTransportMechanic;

    if (isAllSigned && (msb as any).equipment_id) {
      // Kiểm tra xem tất cả vật tư từ TẤT CẢ các phiếu xin cấp vật tư trong cùng repair_request đã cấp đủ chưa
      let remainingMap = new Map<string, number>();
      let allMsbsInRequest: any[] = [];
      let allMsbsInRequestSigned = true;

      if ((msb as any).repair_request_id) {
        // Lấy tất cả MSB trong cùng repair_request (kèm details để tính vật tư), sắp xếp theo createdAt
        allMsbsInRequest = await this.msbRepo.find({
          where: {
            repair_request_id: (msb as any).repair_request_id,
          },
          relations: ['details'],
          order: { createdAt: 'ASC' as any },
        });

        // Tính tổng vật tư: approve chỉ tính từ MSB đầu tiên, supplied tính từ TẤT CẢ MSB
        const summary = new Map<
          string,
          { approve: number; supplied: number }
        >();

        // Lấy MSB đầu tiên (theo createdAt ASC) để tính approve ban đầu
        const firstMsb = allMsbsInRequest[0];

        // Tính approve chỉ từ MSB đầu tiên
        if (firstMsb) {
          for (const d of (firstMsb as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { approve: 0, supplied: 0 };
            agg.approve = Number(d.quantity_approve || d.quantity_request || 0);
            summary.set(key, agg);
          }
        }

        // Tính supplied từ TẤT CẢ MSB trong repair_request
        for (const b of allMsbsInRequest) {
          // Kiểm tra chữ ký
          const hasAllSignatures =
            !!(b as any).lead_warehouse_id &&
            !!(b as any).receiver_id &&
            !!(b as any).deputy_foreman_id &&
            !!(b as any).transport_mechanic_id;

          if (!hasAllSignatures) {
            allMsbsInRequestSigned = false;
          }

          // Tính supplied từ tất cả MSB
          for (const d of (b as any).details || []) {
            const key = d.material_id;
            if (!key) continue;
            const agg = summary.get(key) || { approve: 0, supplied: 0 };
            agg.supplied += Number(d.quantity_supplies || 0);
            summary.set(key, agg);
          }
        }

        // Tính remaining = approve - supplied
        for (const [key, agg] of summary.entries()) {
          if (agg.approve > 0) {
            remainingMap.set(key, Math.max(agg.approve - agg.supplied, 0));
          }
        }
      } else {
        // Nếu không có repair_request_id, tính tất cả MSB của thiết bị
        remainingMap = await this.computeRemainingByMaterial(
          (msb as any).equipment_id,
        );
      }

      // Nếu không còn vật tư nào thiếu (tất cả remaining = 0)
      const allMaterialsSupplied =
        remainingMap.size === 0 ||
        Array.from(remainingMap.values()).every((remaining) => remaining === 0);

      if (allMaterialsSupplied && allMsbsInRequestSigned) {
        // Kiểm tra và tạo work item cho PCĐVT để tạo phiếu nghiệm thu chạy thử sau sửa chữa
        if ((msb as any).equipment_id) {
          await this.repairWorkflowService.checkAndCreateWorkItemForARB(
            (msb as any).equipment_id,
            user.id,
          );
        }

        // Tìm AssignmentBallot liên quan (phiếu 03) theo equipment_id
        const assignmentBallot = await this.assignmentBallotRepo.findOne({
          where: {
            equipment_id: (msb as any).equipment_id,
            status: In(['pending' as any, 'in_progress' as any]) as any,
          },
          order: { createdAt: 'DESC' as any },
        });

        if (assignmentBallot) {
          // Kiểm tra xem ARB đã tồn tại chưa để tránh tạo trùng
          const existingARB = await this.acceptanceRepairBallotRepo.findOne({
            where: {
              equipment_id: (msb as any).equipment_id,
              status: In(['pending' as any, 'done' as any]) as any,
            },
          });

          if (!existingARB) {
            // Tạo biên bản 04 (ARB)
            const arb = this.acceptanceRepairBallotRepo.create({
              name: `BIÊN BẢN NGHIỆM THU CHẠY THỬ VÀ BÀN GIAO THIẾT BỊ SAU SỬA CHỮA - ${(msb as any).name || 'MSB'}`,
              equipment_id: (msb as any).equipment_id,
              status: 'pending',
            });
            const savedArb = await this.acceptanceRepairBallotRepo.save(arb);

            // Add ARB to RepairRequest
            try {
              await this.historyRepairService.addBallotToRepairRequest(
                (msb as any).repair_request_id,
                'ARB',
                (savedArb as any).id,
              );
            } catch (err) {
              console.error('Error adding ARB to RepairRequest:', err);
            }
          }
        }
      }
    }

    return this.toDto(msb);
  }

  async reportEquipment(from?: Date, to?: Date) {
    const baseQuery = this.msbRepo
      .createQueryBuilder('ballot')
      .leftJoin('ballot.equipment', 'equipment')
      .leftJoin('equipment.location', 'location')
      .andWhere('ballot.equipment_id IS NOT NULL');

    if (from) {
      baseQuery.andWhere('ballot.updatedAt >= :from', { from });
    }
    if (to) {
      baseQuery.andWhere('ballot.updatedAt <= :to', { to });
    }

    const totalRepairsSubquery = this.msbRepo
      .createQueryBuilder('b')
      .select('COUNT(b.id)')
      .where('b.equipment_id IS NOT NULL');

    if (from) {
      totalRepairsSubquery.andWhere('b.updatedAt >= :from', { from });
    }
    if (to) {
      totalRepairsSubquery.andWhere('b.updatedAt <= :to', { to });
    }

    const query = baseQuery
      .select([
        'equipment.id AS equipment_id',
        'equipment.name AS equipment_name',
        'equipment.code AS equipment_code',
        'equipment.unit AS unit',
        'location.name AS location_name',
        'COUNT(ballot.id) AS repair_count',
        'MIN(ballot.createdAt) AS created_at',
        'MAX(ballot.updatedAt) AS updated_at',
        `ROUND(COUNT(ballot.id)::numeric / (${totalRepairsSubquery.getQuery()}) * 100, 2) AS repair_percent`,
      ])
      .groupBy('equipment.id')
      .addGroupBy('equipment.name')
      .addGroupBy('equipment.code')
      .addGroupBy('equipment.unit')
      .addGroupBy('location.name')
      .orderBy('repair_count', 'DESC');

    return await query.getRawMany();
  }
}
