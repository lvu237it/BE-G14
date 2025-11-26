import { WorkItem } from 'src/entities/work-item.entity';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { assignmentBallotSignMap } from 'src/common/constants/position_map';
import {
  AssignmentBallotApprovalListItemDto,
  AssignmentBallotListItemDto,
  DelegateAssignmentBallotDto,
  DelegateAssignmentBallotOtherDto,
} from 'src/common/interfaces/dto/assignment-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { AssignmentBallotApproval, Position } from 'src/entities';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { In, Repository } from 'typeorm';
import { WorkItemService } from '../work-item/work-item.service';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';

@Injectable()
export class AssignmentBallotService {
  constructor(
    @InjectRepository(AssignmentBallot)
    private readonly assignmentBallotRepository: Repository<AssignmentBallot>,
    @InjectRepository(AssignmentBallotApproval)
    private readonly assignmentBallotApprovalRepository: Repository<AssignmentBallotApproval>,
    @InjectRepository(MaterialSupplyBallot)
    private readonly materialSupplyBallotRepo: Repository<MaterialSupplyBallot>,
    @InjectRepository(TechnicalAppraisalBallot)
    private readonly technicalAppraisalBallotRepo: Repository<TechnicalAppraisalBallot>,
    @InjectRepository(DetailAppraisalBallot)
    private readonly detailAppraisalBallotRepo: Repository<DetailAppraisalBallot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Position)
    private readonly posRepo: Repository<Position>,
    @InjectRepository(WorkItem)
    private readonly workItemRepository: Repository<WorkItem>,
    private readonly workItemService: WorkItemService,
    @InjectRepository(AcceptanceRepairBallot)
    private readonly historyRepairService: HistoryRepairService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'pending' | 'approved' | 'rejected';
      equipment_id?: string;
      department_repair_id?: string;
      assign_by?: string;
      description?: string;
      name?: string;
      sortBy?:
        | 'name'
        | 'description'
        | 'assign_by'
        | 'equipment_id'
        | 'department_repair_id'
        | 'status'
        | 'createdAt'
        | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<AssignmentBallotListItemDto>> {
    const qb = this.assignmentBallotRepository.createQueryBuilder('e');
    if (filters?.status)
      qb.andWhere('e.status = :status', { status: filters.status });
    if (filters?.equipment_id)
      qb.andWhere('e.equipment_id = :equipment_id', {
        equipment_type_id: filters.equipment_id,
      });
    if (filters?.department_repair_id)
      qb.andWhere('e.department_repair_id = :department_repair_id', {
        department_id: filters.department_repair_id,
      });
    if (filters?.assign_by)
      qb.andWhere('e.assign_by = :assign_by', {
        location_id: filters.assign_by,
      });
    if (filters?.description)
      qb.andWhere('LOWER(e.description) LIKE LOWER(:description)', {
        code: `%${filters.description}%`,
      });
    if (filters?.name)
      qb.andWhere('LOWER(e.name) LIKE LOWER(:name)', {
        name: `%${filters.name}%`,
      });
    if (filters?.search) {
      const search = `%${filters.search}%`;
      qb.andWhere('(LOWER(e.name) LIKE LOWER(:search))', { search });
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

  async findOne(id: string) {
    const entity = await this.assignmentBallotRepository.findOne({
      where: { id },
      relations: [
        'equipment',
        'department',
        'departmentManager',
        'assignByUser',
        'assignmentBallotApproval',
        'assignmentBallotApproval.approver',
        'assignmentBallotApproval.approverLead',
        'assignmentBallotApproval.approverFinal',
        'assignmentBallotApproval.delegatedUser',
        'assignmentBallotApproval.delegatedLeadUser',
      ],
    });

    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const assignedUserIds = entity?.id
      ? await this.workItemService.findAllUsersByRef('ASB', entity.id)
      : [];

    return {
      ...this.toDto(entity),
      assignedUserIds,
    };
  }

  async sign(
    ballotId: string,
    user: any,
  ): Promise<AssignmentBallotListItemDto> {
    const asb = await this.assignmentBallotRepository.findOne({
      where: { id: ballotId },
      relations: ['assignByUser'],
    });
    if (!asb) {
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
    const field = assignmentBallotSignMap[positionCode];
    // console.log(field);
    if (!field || !(field in asb)) {
      throw new BadRequestException(
        'Bạn không được phép ký mục nào trên phiếu này!',
      );
    }

    if (asb[field]) {
      throw new BadRequestException('Mục này đã có người ký!');
    }

    (asb as any)[field] = user.id;
    asb.assign_by = user.id;
    asb.status = 'in_progress';
    await this.assignmentBallotRepository.save(asb);
    try {
      await this.historyRepairService.addBallotToHistory(
        (asb as any).equipment_id,
        'ASB',
        asb.id,
      );
    } catch (e) {
      // Log but don't block main flow
      console.warn('history-repair add failed for ASB sign', e?.message || e);
    }
    const updatedAsb = await this.assignmentBallotRepository.findOne({
      where: { id: asb.id },
      relations: ['assignByUser'],
    });
    const quanDocPosition = await this.posRepo.findOne({
      where: { code: In(['foreman', 'quan_doc', 'QD', 'QĐ']) },
      relations: ['department'],
    });
    if (quanDocPosition) {
      // Tìm user Quản đốc thuộc department sửa chữa
      const quanDocUsers = await this.userRepo.find({
        where: {
          position_id: (quanDocPosition as any).id,
          department_id: asb.department_repair_id,
          status: 'active',
        },
      });
      // Tạo work item cho từng Quản đốc
      for (const quanDocUser of quanDocUsers) {
        // Tạo work item cho Quản đốc: "Ủy quyền và giao việc"
        await this.workItemService.create(
          {
            user_id: (quanDocUser as any).id,
            ref_type: 'ASB',
            ref_id: (asb as any).id,
            task_type: 'delegate',
            task_name: 'Ủy quyền và giao việc cho quản đốc',
            ballot_name: asb.name,
            start_date: new Date(),
          },
          user.id || null,
        );
      }
    }
    await this.workItemService.completeByRef(user.id, 'ASB', asb.id, 'sign');
    return this.toDto(updatedAsb);
  }

  async approve(
    id: string,
    userId: any,
  ): Promise<AssignmentBallotApprovalListItemDto> {
    const entity = await this.assignmentBallotRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }
    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;

    const assignmentBallotApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { assignment_ballot_id: entity.id },
      });

    entity.status = 'done';
    assignmentBallotApproval.status = 'Approved';
    assignmentBallotApproval.approver_final_id = approverId;

    const saved = await this.assignmentBallotApprovalRepository.save(
      assignmentBallotApproval,
    );
    const savedEntity = await this.assignmentBallotRepository.save(entity);
    try {
      await this.historyRepairService.addBallotToHistory(
        (entity as any).equipment_id,
        'ASB',
        entity.id,
      );
    } catch (e) {
      console.warn(
        'history-repair add failed for ASB approve',
        e?.message || e,
      );
    }

    await this.workItemService.completeByRef(
      assignmentBallotApproval.delegated_lead_to,
      'ASB',
      entity.id,
      'approve_adjust_lead',
    );
    const materialSupplyBallot = await this.materialSupplyBallotRepo.find({
  where: { equipment_id: entity.equipment_id, status: 'in_progress' },
});

// materialSupplyBallot là mảng → phải lặp
for (const msb of materialSupplyBallot) {
  const WorkItemMsb = await this.workItemService.findRef(
    msb.id,
    'MSB',
    'completed',
  );
  console.log(WorkItemMsb)
  await this.workItemService.create(
    {
      user_id: approverId,
      ref_type: 'MSB',
      ref_id: WorkItemMsb.ref_id,
      task_type: 'sign',
      task_name: 'Ký phiếu xin cấp vật tư cho tổ trưởng',
      ballot_name: WorkItemMsb.ballot_name,
      start_date: new Date(),
    },
    approverId,
  );
}

// Lấy danh sách DetailAppraisalBallot thay vì findOne
const detailApprisalBallots = await this.detailAppraisalBallotRepo.find({
  where: { equipment_id: entity.equipment_id, status: 'pending' },
});

for (const dab of detailApprisalBallots) {
  await this.workItemService.create(
    {
      user_id: approverId,
      ref_type: 'DAB',
      ref_id: dab.id,
      task_type: 'sign',
      task_name: 'Ký phiếu 02 cho tổ trưởng',
      ballot_name: dab.name,
      start_date: new Date(),
    },
    approverId,
  );
}

// TechnicalAppraisalBallot → dùng find
const technicalApprisalBallots =
  await this.technicalAppraisalBallotRepo.find({
    where: { equipment_id: entity.equipment_id, status: 'pending' },
  });

for (const tab of technicalApprisalBallots) {
  await this.workItemService.create(
    {
      user_id: approverId,
      ref_type: 'TAB',
      ref_id: tab.id,
      task_type: 'sign',
      task_name: 'Ký phiếu 01 cho tổ trưởng',
      ballot_name: tab.name,
      start_date: new Date(),
    },
    approverId,
  );
}

    const updatedAsbApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { id: assignmentBallotApproval.id },
        relations: ['assignmentBallot', 'assignmentBallot.equipment'],
      });
    // (BỎ) Không tạo ARB ở đây nữa - ARB sẽ được tạo khi tổ trưởng ký MSB và tất cả vật tư đã cấp đủ

    return this.toDtoApproval(updatedAsbApproval);
  }

  async reject(
    id: string,
    userId: any,
  ): Promise<AssignmentBallotApprovalListItemDto> {
    const entity = await this.assignmentBallotRepository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;

    const approverUser = await this.userRepo.findOne({
      where: { id: approverId },
      relations: ['position'],
    });

    if (!approverUser || !approverUser.position) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const assignmentBallotApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { assignment_ballot_id: entity.id },
      });

    if (!assignmentBallotApproval) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Phiếu giao việc chưa có approval',
      });
    }

    const positionCode = (approverUser.position.code || '').toLowerCase();

    // --- Nhóm Foreman / PQĐ ---
    const foremanCodes = [
      'foreman',
      'pho_quan_doc',
      'deputy_foreman',
      'pqd',
      'pqđ',
    ];
    if (foremanCodes.includes(positionCode)) {
      await this.workItemService.deleteWorkItemForRef(
        'ASB',
        entity.id,
        'approve_adjust',
      );
      await this.workItemService.deleteWorkItemForRef('MSB', entity.id, 'sign');
      await this.workItemService.deleteWorkItemForRef('DAB', entity.id, 'sign');
      await this.workItemService.deleteWorkItemForRef('TAB', entity.id, 'sign');
      await this.workItemService.create(
        {
          user_id: assignmentBallotApproval.approver_id,
          ref_type: 'ASB',
          ref_id: entity.id,
          task_type: 'delegate',
          task_name: 'Ủy quyền và xác nhận phiếu sửa chữa lại',
          ballot_name: entity.name,
          start_date: new Date(),
        },
        approverId,
      );

      assignmentBallotApproval.status = 'Rejected';
      assignmentBallotApproval.delegated_to = null;
    }

    // --- Nhóm Tổ trưởng / Operator ---
    const leadCodes = ['operator', 'to_truong', 'nguoi_van_hanh', 'tt', 'nvh'];
    if (leadCodes.includes(positionCode)) {
      await this.workItemService.deleteWorkItemForRef(
        'ASB',
        entity.id,
        'approve_adjust_lead',
      );

      await this.workItemService.create(
        {
          user_id: assignmentBallotApproval.approver_lead_id,
          ref_type: 'ASB',
          ref_id: entity.id,
          task_type: 'approve_adjust', // đúng task type cho lead
          task_name: 'Xác nhận lại phiếu sửa chữa',
          ballot_name: entity.name,
          start_date: new Date(),
        },
        approverId,
      );

      assignmentBallotApproval.status = 'Rejected';
      assignmentBallotApproval.delegated_lead_to = null;
    }

    // --- Lưu trạng thái ---
    await this.assignmentBallotApprovalRepository.save(
      assignmentBallotApproval,
    );

    return this.toDtoApproval(assignmentBallotApproval);
  }

  async approveJob(
    id: string,
    userId: any,
    dto: DelegateAssignmentBallotOtherDto,
  ): Promise<AssignmentBallotApprovalListItemDto> {
    const { delegatedUserId } = dto;

    // --- Kiểm tra tham số ---
    if (!id) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Thiếu tham số id',
      });
    }

    if (!delegatedUserId) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Thiếu tham số delegatedUserId',
      });
    }

    // --- Lấy phiếu giao việc ---
    const entity = await this.assignmentBallotRepository.findOne({
      where: { id },
    });
    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    // --- Lấy hoặc tạo record Approval ---
    let entityApproval = await this.assignmentBallotApprovalRepository.findOne({
      where: { assignment_ballot_id: id },
    });

    if (entityApproval && entityApproval.delegated_to) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Phiếu giao việc đã được ủy quyền trước đó',
      });
    }

    // --- Kiểm tra user được ủy quyền ---
    const user = await this.userRepo.findOne({
      where: { id: delegatedUserId },
      relations: ['position'],
    });

    if (!user) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy người dùng được ủy quyền',
      });
    }

    if (!user.position) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Người dùng không có chức vụ hợp lệ',
      });
    }

    // --- Xác định approverId ---
    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;

    // --- Cập nhật hoặc tạo mới record Approval ---
    let assignmentBallotApproval;

    if (entityApproval) {
      entityApproval.delegated_to = dto.delegatedUserId;
      entityApproval.position_name = user.position.name;
      assignmentBallotApproval =
        await this.assignmentBallotApprovalRepository.save(entityApproval);
    } else {
      assignmentBallotApproval = this.assignmentBallotApprovalRepository.create(
        {
          assignment_ballot_id: entity.id,
          approver_id: approverId,
          delegated_to: user.id,
          position_name: user.position.name,
        },
      );
      await this.assignmentBallotApprovalRepository.save(
        assignmentBallotApproval,
      );
    }

    // --- Lấy lại record đầy đủ để trả về ---
    const updatedAsbApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { id: assignmentBallotApproval.id },
        relations: ['assignmentBallot', 'assignmentBallot.equipment'],
      });

    // --- Tạo công việc mới cho người được ủy quyền ---
    await this.workItemService.create(
      {
        user_id: user.id,
        ref_type: 'ASB',
        ref_id: assignmentBallotApproval.assignment_ballot_id,
        task_type: 'approve_adjust',
        task_name: 'Ủy quyền và xác nhận phiếu sửa chữa cho phó quản đốc',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );

    // --- Hoàn thành công việc của người ủy quyền ---
    await this.workItemService.completeByRef(
      approverId,
      'ASB',
      entity.id,
      'delegate',
    );

    return this.toDtoApproval(updatedAsbApproval);
  }

  async approveJobByLead(
    id: string,
    userId: any,
    dto: DelegateAssignmentBallotOtherDto,
  ): Promise<AssignmentBallotApprovalListItemDto> {
    const { delegatedUserId } = dto;
    const approverId: string =
      typeof userId === 'object' && userId !== null
        ? userId.id || userId.userId
        : userId;

    // Validate input parameters
    if (!id) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Thiếu tham số id',
      });
    }

    if (!delegatedUserId) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Thiếu tham số delegatedUserId',
      });
    }

    const entity = await this.assignmentBallotRepository.findOne({
      where: { id },
    });
    const entityApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { assignment_ballot_id: id },
      });

    if (entityApproval && entityApproval.delegated_lead_to) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Phiếu giao việc đã được ủy quyền trước đó',
      });
    }
    if (!entity) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    }

    const user = await this.userRepo.findOne({
      where: { id: delegatedUserId },
      relations: ['position'],
    });

    if (!user) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy người dùng được ủy quyền',
      });
    }

    if (!user.position) {
      throw new BadRequestException({
        errCode: ERROR_CODES.VALIDATION_ERROR,
        message: 'Người dùng không có chức vụ hợp lệ',
      });
    }

    entityApproval.approver_lead_id = approverId;
    entityApproval.delegated_lead_to = delegatedUserId;

    await this.workItemService.create(
      {
        user_id: delegatedUserId,
        ref_type: 'ASB',
        ref_id: entity.id,
        task_type: 'approve_adjust_lead',
        task_name: 'Xác nhận và từ chối phiếu giao việc sửa chữa',
        ballot_name: entity.name,
        start_date: new Date(),
      },
      approverId,
    );

    await this.assignmentBallotApprovalRepository.save(entityApproval);
    const updatedAsbApproval =
      await this.assignmentBallotApprovalRepository.findOne({
        where: { id: entityApproval.id },
        relations: ['assignmentBallot', 'assignmentBallot.equipment'],
      });
    await this.workItemService.completeByRef(
      entityApproval.delegated_to,
      'ASB',
      entity.id,
      'approve_adjust',
    );
  // --- MSB ---
// --- MSB ---
const materialSupplyBallots = await this.materialSupplyBallotRepo.find({
  where: { equipment_id: entity.equipment_id, status: 'in_progress' },
});

for (const msb of materialSupplyBallots) {
  const existingMsbWork = await this.workItemRepository.findOne({
    where: {
      ref_id: msb.id,
      ref_type: 'MSB',
      task_type: 'sign',
      user_id: approverId,
    },
  });

  if (!existingMsbWork) {
    await this.workItemService.create(
      {
        user_id: approverId,
        ref_type: 'MSB',
        ref_id: msb.id,
        task_type: 'sign',
        task_name: 'Ký phiếu xin cấp vật tư cho PQĐ',
        ballot_name: msb.name,
        start_date: new Date(),
      },
      approverId,
    );
  }
}


// --- DAB ---
const detailApprisalBallots = await this.detailAppraisalBallotRepo.find({
  where: { equipment_id: entity.equipment_id, status: 'pending' },
});

for (const dab of detailApprisalBallots) {
  const existingDabWork = await this.workItemRepository.findOne({
    where: {
      ref_id: dab.id,
      ref_type: 'DAB',
      task_type: 'sign',
      user_id: approverId,
    },
  });

  if (!existingDabWork) {
    await this.workItemService.create(
      {
        user_id: approverId,
        ref_type: 'DAB',
        ref_id: dab.id,
        task_type: 'sign',
        task_name: 'Ký phiếu 02 cho PQĐ',
        ballot_name: dab.name,
        start_date: new Date(),
      },
      approverId,
    );
  }
}


// --- TAB ---
const technicalApprisalBallots = await this.technicalAppraisalBallotRepo.find({
  where: { equipment_id: entity.equipment_id, status: 'pending' },
});

for (const tab of technicalApprisalBallots) {
  const existingTabWork = await this.workItemRepository.findOne({
    where: {
      ref_id: tab.id,
      ref_type: 'TAB',
      task_type: 'sign',
      user_id: approverId,
    },
  });

  if (!existingTabWork) {
    await this.workItemService.create(
      {
        user_id: approverId,
        ref_type: 'TAB',
        ref_id: tab.id,
        task_type: 'sign',
        task_name: 'Ký phiếu 01 cho PQĐ',
        ballot_name: tab.name,
        start_date: new Date(),
      },
      approverId,
    );
  }
}



    return this.toDtoApproval(updatedAsbApproval);
  }

  async delegate(
    assignmentBallotId: string,
    approverId: string,
    dto: DelegateAssignmentBallotDto,
  ): Promise<void> {
    // Hoàn thành work item 'delegate' của chính người đang ủy quyền trên ASB này (nếu còn pending)
    await this.workItemService.completeByRef(
      approverId,
      'ASB',
      assignmentBallotId,
      'delegate',
    );
    const assignmentBallot = await this.assignmentBallotRepository.findOne({
      where: { id: assignmentBallotId },
    });
    if (!assignmentBallot)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const approverUser = await this.userRepo.findOne({
      where: { id: approverId },
      relations: ['position'],
    });
    if (!approverUser || !approverUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const positionCode = (approverUser.position.code || '').toLowerCase();

    // Lấy thông tin người được ủy quyền
    const delegatedUser = await this.userRepo.findOne({
      where: { id: dto.delegatedUserId },
      relations: ['position'],
    });
    if (!delegatedUser || !delegatedUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const delegatedCode = (delegatedUser.position.code || '').toLowerCase();

    // Lấy ra MSB, TAB, DAB đúng chuẩn dựa theo assignmentBallot
    const msb = await this.materialSupplyBallotRepo.findOne({
      where: {
        equipment_id: assignmentBallot.equipment_id,
        status: 'in_progress',
      },
      order: { createdAt: 'DESC' },
    });
    if (!msb)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy phiếu xin cấp vật tư liên quan',
      });
    const tab = msb.technical_appraisal_ballot_id
      ? await this.technicalAppraisalBallotRepo.findOne({
          where: { id: msb.technical_appraisal_ballot_id },
        })
      : null;
    const dab = msb.detail_appraisal_ballot_id
      ? await this.detailAppraisalBallotRepo.findOne({
          where: { id: msb.detail_appraisal_ballot_id },
        })
      : null;

    // Trường hợp 1: Quản đốc ủy quyền cho PQĐ → PQĐ nhận TAB/DAB/MSB (Chỉ huy) + delegate
    if (
      (positionCode === 'quan_doc' || positionCode === 'foreman') &&
      ['pho_quan_doc', 'deputy_foreman'].includes(delegatedCode)
    ) {
      const workExisted = await this.workItemService.findExisting([
        { user_id: dto.delegatedUserId, ref_type: 'TAB', ref_id: tab?.id },
        { user_id: dto.delegatedUserId, ref_type: 'DAB', ref_id: dab?.id },
        { user_id: dto.delegatedUserId, ref_type: 'MSB', ref_id: msb.id },
      ]);
      if (!workExisted['TAB'] && tab) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'TAB',
            ref_id: tab.id,
            task_type: 'sign',
            task_name: 'Ký Mẫu số 01/SCTX',
            ballot_name: tab.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      if (!workExisted['DAB'] && dab) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'DAB',
            ref_id: dab.id,
            task_type: 'sign',
            task_name: 'Ký Mẫu số 02/SCTX',
            ballot_name: dab.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      if (!workExisted['MSB']) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'MSB',
            ref_id: msb.id,
            task_type: 'sign',
            task_name: 'Ký Phiếu xin cấp vật tư (Chỉ huy)',
            ballot_name: msb.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      // Giao tiếp tục: delegate
      await this.workItemService.create(
        {
          user_id: dto.delegatedUserId,
          ref_type: 'ASB',
          ref_id: assignmentBallotId,
          task_type: 'delegate',
          task_name: 'Ủy quyền và giao việc',
          ballot_name: assignmentBallot.name,
          start_date: new Date(),
        },
        approverId,
      );
      return;
    }

    // Trường hợp 2: Quản đốc hoặc PQĐ ủy quyền cho Tổ trưởng/Người vận hành → người nhận ký TAB/DAB/MSB (Người nhận)
    if (
      [
        'quan_doc',
        'foreman',
        'pho_quan_doc',
        'deputy_foreman',
        'PQĐ',
        'PQD',
      ].includes(positionCode) &&
      ['operator', 'to_truong', 'nguoi_van_hanh', 'TT', 'NVH'].includes(
        delegatedCode,
      )
    ) {
      const workExisted = await this.workItemService.findExisting([
        { user_id: dto.delegatedUserId, ref_type: 'TAB', ref_id: tab?.id },
        { user_id: dto.delegatedUserId, ref_type: 'DAB', ref_id: dab?.id },
        { user_id: dto.delegatedUserId, ref_type: 'MSB', ref_id: msb.id },
      ]);
      if (!workExisted['TAB'] && tab) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'TAB',
            ref_id: tab.id,
            task_type: 'sign',
            task_name: 'Ký Mẫu số 01/SCTX',
            ballot_name: tab.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      if (!workExisted['DAB'] && dab) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'DAB',
            ref_id: dab.id,
            task_type: 'sign',
            task_name: 'Ký Mẫu số 02/SCTX',
            ballot_name: dab.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      if (!workExisted['MSB']) {
        await this.workItemService.create(
          {
            user_id: dto.delegatedUserId,
            ref_type: 'MSB',
            ref_id: msb.id,
            task_type: 'sign',
            task_name: 'Ký Phiếu xin cấp vật tư (Người nhận)',
            ballot_name: msb.name,
            start_date: new Date(),
          },
          approverId,
        );
      }
      return;
    }
  }
  // Ủy quyền cho PQĐ - only quản đốc/foreman to deputy_foreman
  async delegateForDeputyForeman(
    assignmentBallotId: string,
    approverId: string,
    dto: DelegateAssignmentBallotDto,
  ): Promise<void> {
    // Lấy thông tin role
    const approverUser = await this.userRepo.findOne({
      where: { id: approverId },
      relations: ['position'],
    });
    if (!approverUser || !approverUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const positionCode = (approverUser.position.code || '').toLowerCase();
    const delegatedUser = await this.userRepo.findOne({
      where: { id: dto.delegatedUserId },
      relations: ['position'],
    });
    if (!delegatedUser || !delegatedUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const delegatedCode = (delegatedUser.position.code || '').toLowerCase();
    // Only quản đốc (quan_doc, foreman) => PQĐ (pho_quan_doc, deputy_foreman)
    if (
      !(
        ['quan_doc', 'foreman'].includes(positionCode) &&
        ['pho_quan_doc', 'deputy_foreman'].includes(delegatedCode)
      )
    ) {
      throw new BadRequestException('Sai vai trò/phạm vi ủy quyền');
    }
    // Tận dụng lại logic trong delegate cũ:
    await this.delegate(assignmentBallotId, approverId, dto);
  }

  // Ủy quyền cho tổ trưởng/người vận hành - chỉ PQĐ, quản đốc đến operator/to_truong/người_vận_hành
  async delegateForOperator(
    assignmentBallotId: string,
    approverId: string,
    dto: DelegateAssignmentBallotDto,
  ): Promise<void> {
    const approverUser = await this.userRepo.findOne({
      where: { id: approverId },
      relations: ['position'],
    });
    if (!approverUser || !approverUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const positionCode = (approverUser.position.code || '').toLowerCase();
    const delegatedUser = await this.userRepo.findOne({
      where: { id: dto.delegatedUserId },
      relations: ['position'],
    });
    if (!delegatedUser || !delegatedUser.position)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    const delegatedCode = (delegatedUser.position.code || '').toLowerCase();
    // Chỉ quản đốc, PQĐ, foreman, deputy_foreman mới được thực hiện; bên nhận phải là tổ trưởng/operator/người vận hành/TT/NVH
    if (
      !(
        [
          'quan_doc',
          'foreman',
          'pho_quan_doc',
          'deputy_foreman',
          'pqd',
          'pqđ',
        ].includes(positionCode) &&
        ['operator', 'to_truong', 'nguoi_van_hanh', 'tt', 'nvh'].includes(
          delegatedCode,
        )
      )
    ) {
      throw new BadRequestException('Sai vai trò/phạm vi ủy quyền');
    }
    await this.delegate(assignmentBallotId, approverId, dto);
  }
  async listDeputyForemen(departmentRepairId: string) {
    const deputyForemen = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.position', 'p')
      .where('u.department_id = :departmentRepairId', { departmentRepairId })
      .andWhere('(p.code) IN (:...roles)', {
        roles: ['pho_quan_doc', 'deputy_foreman', 'PQD', 'PQĐ'],
      })
      .andWhere("u.status = 'active'")
      .orderBy('u.firstname', 'ASC')
      .getMany();

    return deputyForemen.map((u) => ({
      id: u.id,
      firstname: u.firstname,
      lastname: u.lastname,
      position: u.position?.name,
      department_id: u.department_id,
    }));
  }

  async listOperators(departmentRepairId: string) {
    const operators = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.position', 'p')
      .where('u.department_id = :departmentRepairId', { departmentRepairId })
      .andWhere('(p.code) IN (:...roles)', {
        roles: ['operator', 'to_truong', 'nguoi_van_hanh', 'TT', 'NVH'],
      })
      .andWhere("u.status = 'active'")
      .orderBy('u.firstname', 'ASC')
      .getMany();

    return operators.map((u) => ({
      id: u.id,
      firstname: u.firstname,
      lastname: u.lastname,
      position: u.position?.name,
      department_id: u.department_id,
    }));
  }

  private toDto(e: AssignmentBallot): AssignmentBallotListItemDto & {
    approval?: AssignmentBallotApprovalListItemDto | null;
  } {
    return {
      id: e.id,
      name: e.name,
      description: e.description,
      department_repair_id: e.department
        ? {
            id: e.department.id,
            name: e.department.name,
            code: e.department.code,
          }
        : null,

      department_manager: e.departmentManager
        ? {
            id: e.departmentManager.id,
            name: e.departmentManager.name,
            code: e.departmentManager.code,
          }
        : null,

      assign_by: e.assignByUser
        ? {
            id: e.assignByUser.id,
            fullname: e.assignByUser.lastname + ' ' + e.assignByUser.firstname,
            code: e.assignByUser.code,
          }
        : null,

      equipment: e.equipment
        ? {
            id: e.equipment.id,
            name: e.equipment.name,
            code: e.equipment.code,
          }
        : null,

      status: e.status,
      createdAt: e.createdAt ?? null,
      updatedAt: e.updatedAt ?? null,

      // 👇 Thêm phần này để trả về cả thông tin phiếu duyệt (approval)
      approval: e.assignmentBallotApproval
        ? this.toDtoApproval(e.assignmentBallotApproval)
        : null,
    };
  }

  private toDtoApproval(
    e: AssignmentBallotApproval,
  ): AssignmentBallotApprovalListItemDto {
    return {
      id: (e as any).id,
      assignment_ballot_id: e.assignmentBallot
        ? {
            id: e.assignmentBallot.id,
            name: e.assignmentBallot.name,
            equipment: e.assignmentBallot.equipment
              ? {
                  id: e.assignmentBallot.equipment.id,
                  name: e.assignmentBallot.equipment.name,
                  code: e.assignmentBallot.equipment.code,
                }
              : null,
          }
        : null,
      approver: e.approver
        ? {
            id: e.approver.id,
            name: `${e.approver.lastname ?? ''} ${e.approver.firstname ?? ''}`.trim(),
          }
        : null,
      approverLead: e.approverLead
        ? {
            id: e.approverLead.id,
            name: `${e.approverLead.lastname ?? ''} ${e.approverLead.firstname ?? ''}`.trim(),
          }
        : null,
      approverFinal: e.approverFinal
        ? {
            id: e.approverFinal.id,
            name: `${e.approverFinal.lastname ?? ''} ${e.approverFinal.firstname ?? ''}`.trim(),
          }
        : null,
      position_name: e.position_name ?? null,
      delegatedUser: e.delegatedUser
        ? {
            id: e.delegatedUser.id,
            name: `${e.delegatedUser.lastname ?? ''} ${e.delegatedUser.firstname ?? ''}`.trim(),
          }
        : null,
      delegatedLeadUser: e.delegatedLeadUser
        ? {
            id: e.delegatedLeadUser.id,
            name: `${e.delegatedLeadUser.lastname ?? ''} ${e.delegatedLeadUser.firstname ?? ''}`.trim(),
          }
        : null,
      status: e.status,
    };
  }
}
