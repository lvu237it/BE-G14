import { QualityAssessmentBallot } from './../../entities/quality-assessment-ballot.entity';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import { AcceptanceRepairBallotListItemDto } from 'src/common/interfaces/dto/acceptance-repair-ballot.dto';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
import { Department, DetailAppraisalBallot, Equipment, Position, User } from 'src/entities';
import { WorkItemService } from '../work-item/work-item.service';
import { HistoryRepairService } from 'src/modules/history-repair/history-repair.service';
import {
  acceptainceRepairBallotSignMap,
  appraisalBallotSignMap,
} from 'src/common/constants/position_map';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { HistoryRepair } from 'src/entities/history-repair.entity';

@Injectable()
export class AcceptanceRepairBallotService {
  constructor(
    @InjectRepository(AcceptanceRepairBallot)
    private readonly arbRepository: Repository<AcceptanceRepairBallot>,
    @InjectRepository(QualityAssessmentBallot)
    private readonly qualityAssessmentBallotRepository: Repository<QualityAssessmentBallot>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(Department)
    private readonly depRepo: Repository<Department>,
    @InjectRepository(Position)
    private readonly posRepo: Repository<Position>,
    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,
    @InjectRepository(DetailAppraisalBallot)
    private readonly dabRepo: Repository<DetailAppraisalBallot>,
    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
    @InjectRepository(HistoryRepair)
    private readonly hrRepo: Repository<HistoryRepair>,
    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    private readonly historyRepairService: HistoryRepairService,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    filters?: {
      search?: string;
      status?: 'pending' | 'done';
      equipment_id?: string;
      sortBy?: 'name' | 'status' | 'createdAt' | 'updatedAt';
      sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
    },
  ): Promise<PaginatedResponse<AcceptanceRepairBallotListItemDto>> {
    const qb = this.arbRepository.createQueryBuilder('arb');

    if (filters?.status)
      qb.andWhere('arb.status = :status', { status: filters.status });

    if (filters?.equipment_id)
      qb.andWhere('arb.equipment_id = :equipment_id', {
        equipment_id: filters.equipment_id,
      });

    if (filters?.search) {
      const search = `%${filters.search}%`;
      qb.andWhere('(LOWER(arb.name) LIKE LOWER(:search))', { search });
    }

    // Sort
    const sortField = filters?.sortBy ?? 'createdAt';
    const sortOrder = (filters?.sortOrder ?? 'DESC').toUpperCase() as
      | 'ASC'
      | 'DESC';
    qb.orderBy(`arb.${sortField}`, sortOrder);

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

  async findOne(id: string): Promise<AcceptanceRepairBallotListItemDto> {
    const arb = await this.arbRepository.findOne({
      where: { id },
      relations: [
        'equipment',
        'equipment.department',
        'operatorUser',
        'operatorUser.department',
        'operatorUser.position',
        'equipmentManager',
        'equipmentManager.department',
        'equipmentManager.position',
        'repairmanUser',
        'repairmanUser.department',
        'repairmanUser.position',
        'transportUser',
        'transportUser.department',
        'transportUser.position',
      ],
    });

    if (!arb)
      throw new NotFoundException({
        errCode: ERROR_CODES.RECORD_NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND],
      });
    let signUsers = [];
  if (arb.sign_ids?.length) {
    signUsers = await this.userRepo.find({
      where: { id: In(arb.sign_ids) },
      relations: ['department', 'position']
    });
  }
    return this.toDto(arb, signUsers);
  }

  async create(
    ballotId: string,
    user: any,
  ): Promise<AcceptanceRepairBallotListItemDto> {
    const arb = await this.arbRepository.findOne({
      where: { id: ballotId },
      relations: [
        'equipment',
        'equipment.department',
      ],
    });

    if (!arb) {
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
    const historyRepair = await this.hrRepo.findOne({
      where: {
        acceptance_repair_id:arb.id,
      }
    });
    const msb= await this.msbRepo.findOne({
      where: {
        id : historyRepair.material_supply_ballot_id
      }
    });
    arb.fixDate = msb.createdAt;
    const positionCode = userWithPosition.position.code.toLowerCase();
     const equipment = await this.dabRepo.findOne({ where: { equipment_id: arb.equipment_id } });
    // Hoàn tất công việc ký
    await this.workItemService.completeByRef(user.id, 'ARB', ballotId, 'create_ballot');
    arb.status='pending';
    arb.sign_ids = [
  equipment.transport_mechanic_id,
  equipment.operator_id,
  equipment.equipment_manager_id,
  equipment.repairman_id,
].filter(Boolean);
    await this.arbRepository.save(arb);
    await this.workItemService.create(
      {
        user_id: user.id,
        ref_type: 'ARB',
        ref_id: arb.id,
        task_type: 'sign',
        task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
        ballot_name: arb.name,
        start_date: new Date(),
      },
      user.id,
    );
 
  // const department = await this.depRepo.findOne({ where: { id: equipment.department_id } });
  // const positionForeMan = await this.posRepo.findOne({
  //   where: { department: { id: department.id }, code: ILike('QD') },
  //   relations: ['department'],
  // });
  // const positionDeputyForeman = await this.posRepo.findOne({
  //   where: { department: { id: department.id }, code: ILike('PQD') },
  //   relations: ['department'],
  // });
  // const positionLead = await this.posRepo.findOne({
  //   where: { department: { id: department.id }, code: ILike('TT') },
  //   relations: ['department'],
  // });
  // console.log(equipment,department,positionForeMan,positionDeputyForeman,positionLead)
  // const userWork = await this.userRepo.findOne({ where: { position_id: positionForeMan.id }});
  // const userWorkDeputy = await this.userRepo.findOne({ where: { position_id: positionDeputyForeman.id } });
  // const userWorkLead = await this.userRepo.findOne({ where: { position_id: positionLead.id } });
  // console.log(userWork,userWorkDeputy,userWorkLead)
  await this.workItemService.create(
    {
      user_id: equipment.operator_id,
      ref_type: 'ARB',
      ref_id: arb.id,
      task_type: 'sign',
      task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
      ballot_name: arb.name,
      start_date: new Date(),
    },
    user.id,
  );

  await this.workItemService.create(
    {
      user_id: equipment.equipment_manager_id,
      ref_type: 'ARB',
      ref_id: arb.id,
      task_type: 'sign',
      task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
      ballot_name: arb.name,
      start_date: new Date(),
    },
    user.id,
  );

  await this.workItemService.create(
    {
      user_id: equipment.repairman_id,
      ref_type: 'ARB',
      ref_id: arb.id,
      task_type: 'sign',
      task_name: 'Ký phiếu đánh giá chất lượng sau sửa chữa',
      ballot_name: arb.name,
      start_date: new Date(),
    },
    user.id,
  );
    return this.toDto(arb);
  }

  async sign(
    ballotId: string,
    user: any,
  ): Promise<AcceptanceRepairBallotListItemDto> {
    const arb = await this.arbRepository.findOne({
      where: { id: ballotId },
      relations: [
        'equipment',
        'equipment.department',
        'operatorUser',
        'operatorUser.department',
        'operatorUser.position',
        'equipmentManager',
        'equipmentManager.department',
        'equipmentManager.position',
        'repairmanUser',
        'repairmanUser.department',
        'repairmanUser.position',
        'transportUser',
        'transportUser.department',
        'transportUser.position',
      ],
    });

    if (!arb) {
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

    // Tìm MSB mới nhất của thiết bị
    const relatedMsb = await this.msbRepo.findOne({
      where: { equipment_id: arb.equipment_id as any },
      order: { createdAt: 'DESC' as any },
    });

    const isSelectedEquipmentManager =
      relatedMsb && (relatedMsb as any).equipment_manager_id === user.id;

    let field: string | null = null;

    if (isSelectedEquipmentManager && !arb.equipment_manager_id) {
      field = 'equipment_manager_id';
    } else {
      field = acceptainceRepairBallotSignMap[positionCode];
      if (!field || !(field in arb)) {
        throw new BadRequestException(
          'Bạn không được phép ký mục nào trên phiếu này!',
        );
      }
      if (arb[field]) {
        throw new BadRequestException('Mục này đã có người ký!');
      }
    }

    // Ghi chữ ký
    (arb as any)[field] = user.id;
    arb.updatedBy = user.id;

    const requiredFields = [
      'operator_id', // TT
      'repairman_id', // PQĐ
      'equipment_manager_id', // QĐ
      'transport_mechanic_id', // CĐVT
    ];

    // Kiểm tra đủ chữ ký
    const isAllSigned = requiredFields.every((f) => (arb as any)[f]);

    if (isAllSigned) {
      arb.status = 'done';
      await this.arbRepository.save(arb);
      try {
        await this.historyRepairService.addBallotToHistory(
          arb.equipment_id as any,
          'ARB',
          arb.id,
        );
      } catch (e) {
        console.warn('history-repair add failed for ARB', e?.message || e);
      }

      const repairRequest = await this.repairRequestRepo.findOne({
      where: {
        equipment_id: arb.equipment_id,
        status: 'pending' as any,
      },
      order: { createdAt: 'DESC' as any },
    });

    if (!repairRequest) return;

    const repairRequestId = (repairRequest as any).id;

      // Chỉ tạo phiếu đánh giá khi tất cả đã ký
      const qualityAssessmentBallot =
        this.qualityAssessmentBallotRepository.create({
          name: `Phiếu đánh giá chất lượng sau sửa chữa - ${arb.name}`,
          equipment_id: arb.equipment_id,
        });

      await this.qualityAssessmentBallotRepository.save(
        qualityAssessmentBallot,
      );
      try {
        await this.historyRepairService.addBallotToHistory(
          arb.equipment_id as any,
          'QAB',
          qualityAssessmentBallot.id,
        );
        await this.historyRepairService.addBallotToRepairRequest(
        repairRequestId,
        'QAB',
        qualityAssessmentBallot.id,
      );
      } catch (e) {
        console.warn(
          'history-repair add failed for QAB (from ARB)',
          e?.message || e,
        );
      }
      const updateArb = await this.arbRepository.findOne({where:{id:ballotId}})
      await this.workItemService.create(
        {
          user_id: updateArb.repairman_id,
          ref_type: 'QAB',
          ref_id: qualityAssessmentBallot.id,
          task_type: 'update_items',
          task_name: 'Xác nhận tạo đánh giá chất lượng sau sửa chữa',
          ballot_name: qualityAssessmentBallot.name,
          start_date: new Date(),
        },
        user.id,
      );
    } else {
      await this.arbRepository.save(arb);
    }

    // Hoàn tất công việc ký
    await this.workItemService.completeByRef(user.id, 'ARB', ballotId, 'sign');

    return this.toDto(arb);
  }

 private toDto(
  q: AcceptanceRepairBallot,
  signUsers: User[] = [],
): AcceptanceRepairBallotListItemDto {

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
      operatorUser: q.operatorUser
        ? {
            id: q.operatorUser.id,
            name: `${q.operatorUser.lastname ?? ''} ${q.operatorUser.firstname ?? ''}`.trim(),
            department: q.operatorUser.department
              ? {
                  id: q.operatorUser.department.id,
                  name: q.operatorUser.department.name,
                }
              : null,
            position: q.operatorUser.position
              ? {
                  id: q.operatorUser.position.id,
                  name: q.operatorUser.position.name,
                  code: q.operatorUser.position.code,
                }
              : null,
          }
        : null,
      equipmentManager: q.equipmentManager
        ? {
            id: q.equipmentManager.id,
            name: `${q.equipmentManager.lastname ?? ''} ${q.equipmentManager.firstname ?? ''}`.trim(),
            department: q.equipmentManager.department
              ? {
                  id: q.equipmentManager.department.id,
                  name: q.equipmentManager.department.name,
                }
              : null,
            position: q.equipmentManager.position
              ? {
                  id: q.equipmentManager.position.id,
                  name: q.equipmentManager.position.name,
                  code: q.equipmentManager.position.code,
                }
              : null,
          }
        : null,
      repairmanUser: q.repairmanUser
        ? {
            id: q.repairmanUser.id,
            name: `${q.repairmanUser.lastname ?? ''} ${q.repairmanUser.firstname ?? ''}`.trim(),
            department: q.repairmanUser.department
              ? {
                  id: q.repairmanUser.department.id,
                  name: q.repairmanUser.department.name,
                }
              : null,
            position: q.repairmanUser.position
              ? {
                  id: q.repairmanUser.position.id,
                  name: q.repairmanUser.position.name,
                  code: q.repairmanUser.position.code,
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
      fixDate : q.fixDate ?? null,
      createdAt: q.createdAt ?? null,
      updatedAt: q.updatedAt ?? null,
    };
  }
}
