import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { appraisalBallotSignMap } from 'src/common/constants/position_map';
import { TechnicalAppraisalBallotViewDto } from 'src/common/interfaces/dto/technical-appraisal-ballot.dto';
import { Department } from 'src/entities/department.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { In, Repository } from 'typeorm';
import { WorkItemService } from '../work-item/work-item.service';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';
import { RepairWorkflowService } from 'src/modules/history-repair/repair-workflow.service';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';

@Injectable()
export class TechnicalAppraisalBallotService {
  constructor(
    @InjectRepository(TechnicalAppraisalBallot)
    private readonly technicalAppraisalBallotRepo: Repository<TechnicalAppraisalBallot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,
    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    private readonly historyRepairService: HistoryRepairService,
    private readonly repairWorkflowService: RepairWorkflowService,
  ) {}

  async findOne(id: string): Promise<TechnicalAppraisalBallotViewDto> {
    const ballot = await this.technicalAppraisalBallotRepo.findOne({
      where: { id: id as any },
      relations: [
        'equipment',
        'operator',
        'operator.position',
        'equipmentManager',
        'equipmentManager.position',
        'repairman',
        'repairman.position',
        'transportMechanic',
        'transportMechanic.position',
      ],
    });

    if (!ballot) {
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy biên bản giám định kỹ thuật',
      });
    }

    // Gather department IDs from related users
    const depIds: string[] = [];
    const pushIf = (v?: string | null) => {
      if (v) depIds.push(v);
    };
    pushIf((ballot as any).operator?.department_id ?? null);
    pushIf((ballot as any).equipmentManager?.department_id ?? null);
    pushIf((ballot as any).repairman?.department_id ?? null);
    pushIf((ballot as any).transportMechanic?.department_id ?? null);
    let deptById: Record<string, Department> = {};
    if (depIds.length) {
      const deps = await this.departmentRepo.find({
        where: { id: In(depIds) },
      });
      deptById = deps.reduce(
        (acc: any, d: any) => {
          acc[d.id] = d;
          return acc;
        },
        {} as Record<string, Department>,
      );
    }

    let assignedUserIds: string[] = [];
    if (ballot?.id) {
      assignedUserIds = await this.workItemService.findAllUsersByRef(
        'TAB',
        ballot.id,
      );
    }
    return {
      ...this.toDto(ballot, deptById),
      assignedUserIds: assignedUserIds,
    };
  }

  private toDto(
    ballot: TechnicalAppraisalBallot,
    deptById: Record<string, Department> = {},
  ): TechnicalAppraisalBallotViewDto {
    const pickDept = (deptId?: string | null) => {
      if (!deptId) return null;
      const d: any = deptById[deptId];
      if (!d) return null;
      return { code: d.code ?? null, name: d.name ?? null };
    };
    return {
      id: (ballot as any).id,
      name: ballot.name,
      equipment: ballot.equipment
        ? {
            id: (ballot.equipment as any).id,
            unit: ballot.equipment.unit,
            code: ballot.equipment.code,
            name: ballot.equipment.name,
          }
        : null,
      technical_status: ballot.technical_status ?? null,
      reason: ballot.reason ?? null,
      solution: ballot.solution ?? null,
      notes: ballot.notes ?? null,
      operator: ballot.operator
        ? {
            id: ballot.operator.id,
            code: ballot.operator.code,
            firstname: ballot.operator.firstname,
            lastname: ballot.operator.lastname,
            position: ballot.operator.position
              ? {
                  code: ballot.operator.position.code,
                  name: ballot.operator.position.name,
                }
              : null,
            department: pickDept((ballot.operator as any).department_id),
          }
        : null,
      equipment_manager: ballot.equipmentManager
        ? {
            id: ballot.equipmentManager.id,
            code: ballot.equipmentManager.code,
            firstname: ballot.equipmentManager.firstname,
            lastname: ballot.equipmentManager.lastname,
            position: ballot.equipmentManager.position
              ? {
                  code: ballot.equipmentManager.position.code,
                  name: ballot.equipmentManager.position.name,
                }
              : null,
            department: pickDept(
              (ballot.equipmentManager as any).department_id,
            ),
          }
        : null,
      repairman: ballot.repairman
        ? {
            id: ballot.repairman.id,
            code: ballot.repairman.code,
            firstname: ballot.repairman.firstname,
            lastname: ballot.repairman.lastname,
            position: ballot.repairman.position
              ? {
                  code: ballot.repairman.position.code,
                  name: ballot.repairman.position.name,
                }
              : null,
            department: pickDept((ballot.repairman as any).department_id),
          }
        : null,
      transport_mechanic: ballot.transportMechanic
        ? {
            id: ballot.transportMechanic.id,
            code: ballot.transportMechanic.code,
            firstname: ballot.transportMechanic.firstname,
            lastname: ballot.transportMechanic.lastname,
            position: ballot.transportMechanic.position
              ? {
                  code: ballot.transportMechanic.position.code,
                  name: ballot.transportMechanic.position.name,
                }
              : null,
            department: pickDept(
              (ballot.transportMechanic as any).department_id,
            ),
          }
        : null,
      status: ballot.status,
      createdAt: (ballot as any).createdAt ?? null,
      updatedAt: (ballot as any).updatedAt ?? null,
    };
  }

  async sign(id: string, user: any): Promise<any> {
    const ballot = await this.technicalAppraisalBallotRepo.findOne({
      where: { id: id as any },
    });
    let userWithPosition = user;
    if (!user.position) {
      userWithPosition = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['position'],
      });
    }
    if (!ballot)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: 'Không tìm thấy biên bản giám định kỹ thuật',
      });

    const positionCode = (
      userWithPosition.position?.code ??
      userWithPosition.position_code ??
      ''
    ).toLowerCase();

    // Kiểm tra xem user có phải là người được chọn trong MSB để ký equipment_manager_id không
    const relatedMsb = await this.msbRepo.findOne({
      where: { technical_appraisal_ballot_id: id as any },
    });
    const isSelectedEquipmentManager =
      relatedMsb && (relatedMsb as any).equipment_manager_id === user.id;

    // CHỈ người được chọn trong MSB mới được ký vào equipment_manager_id
    let field: string | null = null;
    if (isSelectedEquipmentManager && !(ballot as any).equipment_manager_id) {
      // CHỈ người được chọn trong MSB mới được ký vào equipment_manager_id
      field = 'equipment_manager_id';
    } else if (positionCode === 'pqd' || positionCode === 'pqđ') {
      // Phó quản đốc chỉ có thể ký vào repairman_id (không được ký equipment_manager_id)
      if (!(ballot as any).repairman_id) {
        field = 'repairman_id';
      } else {
        throw new BadRequestException({
          errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
          message: 'Mục này đã có người ký!',
        });
      }
    } else {
      field = appraisalBallotSignMap[positionCode];
      if (!field || !(field in ballot)) {
        throw new BadRequestException({
          errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
          message: 'Bạn không được phép ký mục nào trên biên bản này!',
        });
      }
      if (ballot[field])
        throw new BadRequestException({
          errCode: ERROR_CODES.CONSTRAINT_VIOLATION,
          message: 'Mục này đã có người ký!',
        });
    }
    (ballot as any)[field] = user.id;
    (ballot as any).updatedBy = user.id;
    await this.technicalAppraisalBallotRepo.save(ballot);
    try {
      await this.historyRepairService.addBallotToHistory(
        (ballot as any).equipment_id,
        'TAB',
        (ballot as any).id,
      );
    } catch (e) {
      console.warn('history-repair add failed for TAB sign', e?.message || e);
    }
    await this.workItemService.completeByRef(user.id, 'TAB', id, 'sign');

    // Kiểm tra xem TAB đã ký đủ 4 người chưa
    const tabSigned =
      !!(ballot as any).operator_id &&
      !!(ballot as any).equipment_manager_id &&
      !!(ballot as any).repairman_id &&
      !!(ballot as any).transport_mechanic_id;

    // Nếu TAB đã ký đủ, kiểm tra và tạo work item cho PCĐVT
    if (tabSigned) {
      (ballot as any).status = 'done';
      await this.technicalAppraisalBallotRepo.save(ballot);
    }

    if (tabSigned && (ballot as any).equipment_id) {
      await this.repairWorkflowService.checkAndCreateWorkItemForARB(
        (ballot as any).equipment_id,
        user.id,
      );
    }

    const {
      technical_status,
      reason,
      solution,
      createdAt,
      updatedAt,
      ...rest
    } = ballot;
    return rest;
  }
}
