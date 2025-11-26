import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { Position } from 'src/entities/position.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { WorkItem } from 'src/entities/work-item.entity';
import { In, Repository } from 'typeorm';
import { WorkItemService } from '../work-item/work-item.service';
import { HistoryRepairService } from './history-repair.service';

@Injectable()
export class RepairWorkflowService {
  constructor(
    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,
    @InjectRepository(TechnicalAppraisalBallot)
    private readonly tabRepo: Repository<TechnicalAppraisalBallot>,
    @InjectRepository(DetailAppraisalBallot)
    private readonly dabRepo: Repository<DetailAppraisalBallot>,
    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
    @InjectRepository(Position)
    private readonly positionRepo: Repository<Position>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(AcceptanceRepairBallot)
    private readonly arbRepo: Repository<AcceptanceRepairBallot>,
    @Inject(forwardRef(() => WorkItemService))
    private readonly workItemService: WorkItemService,
    @Inject(forwardRef(() => HistoryRepairService))
    private readonly historyRepairService: HistoryRepairService,
  ) {}

  async checkAndCreateWorkItemForARB(
    equipmentId: string,
    createdByUserId: string,
  ): Promise<void> {
    // Tìm repair_request hiện tại của thiết bị
    const repairRequest = await this.repairRequestRepo.findOne({
      where: {
        equipment_id: equipmentId,
        status: 'pending' as any,
      },
      order: { createdAt: 'DESC' as any },
    });

    if (!repairRequest) return;

    const repairRequestId = (repairRequest as any).id;

    // Kiểm tra tất cả MSB trong repair_request đã ký đủ chưa
    const allMsbsInRequest = await this.msbRepo.find({
      where: {
        repair_request_id: repairRequestId,
      },
      relations: ['details'],
      order: { createdAt: 'ASC' as any },
    });

    if (allMsbsInRequest.length === 0) return;

    // Kiểm tra tất cả MSB đã ký đủ chưa
    let allMsbsInRequestSigned = true;
    for (const b of allMsbsInRequest) {
      const hasAllSignatures =
        !!(b as any).lead_warehouse_id &&
        !!(b as any).receiver_id &&
        !!(b as any).deputy_foreman_id &&
        !!(b as any).transport_mechanic_id;

      if (!hasAllSignatures) {
        allMsbsInRequestSigned = false;
        break;
      }
    }

    if (!allMsbsInRequestSigned) return;

    // Tính vật tư đã cấp đủ chưa
    const summary = new Map<string, { requested: number; supplied: number }>();

    const firstMsb = allMsbsInRequest[0];
    if (firstMsb) {
      for (const d of (firstMsb as any).details || []) {
        const key = d.material_id;
        if (!key) continue;
        const agg = summary.get(key) || { requested: 0, supplied: 0 };
        agg.requested = Number(d.quantity_approve || 0);
        summary.set(key, agg);
      }
    }

    for (const b of allMsbsInRequest) {
      for (const d of (b as any).details || []) {
        const key = d.material_id;
        if (!key) continue;
        const agg = summary.get(key) || { requested: 0, supplied: 0 };
        agg.supplied += Number(d.quantity_supplies || 0);
        summary.set(key, agg);
      }
    }

    const remainingMap = new Map<string, number>();
    for (const [key, agg] of summary.entries()) {
      if (agg.requested > 0) {
        remainingMap.set(key, Math.max(agg.requested - agg.supplied, 0));
      }
    }

    const allMaterialsSupplied =
      remainingMap.size === 0 ||
      Array.from(remainingMap.values()).every((remaining) => remaining === 0);

    if (!allMaterialsSupplied) return;

    // Kiểm tra TAB và DAB đã ký đủ chưa
    const allMsbsForCheck = await this.msbRepo.find({
      where: {
        repair_request_id: repairRequestId,
      },
      relations: ['technicalAppraisalBallot', 'detailAppraisalBallot'],
    });

    let tab: any = null;
    let dab: any = null;

    for (const msbItem of allMsbsForCheck) {
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

    if (!tab || !dab) return;

    const tabSigned =
      !!(tab as any).operator_id &&
      !!(tab as any).equipment_manager_id &&
      !!(tab as any).repairman_id &&
      !!(tab as any).transport_mechanic_id;

    const dabSigned =
      !!(dab as any).operator_id &&
      !!(dab as any).equipment_manager_id &&
      !!(dab as any).repairman_id &&
      !!(dab as any).transport_mechanic_id;

    if (!tabSigned || !dabSigned) return;

    // 1. Kiểm tra ARB đã tồn tại chưa cho thiết bị này trạng thái 'pending'
    let arb = await this.arbRepo.findOne({
      where: { equipment_id: equipmentId, status: 'pending' },
    });

    if (!arb) {
      arb = this.arbRepo.create({
        name: `BIÊN BẢN NGHIỆM THU CHẠY THỬ VÀ BÀN GIAO THIẾT BỊ SAU SỬA CHỮA - ${firstMsb?.name || equipmentId}`,
        equipment_id: equipmentId,
        status: 'draft',
      });
      await this.arbRepo.save(arb);
      await this.historyRepairService.addBallotToRepairRequest(
        repairRequestId,
        'ARB',
        arb.id,
      );
    }

    // 2. Xử lý work item:
    // Tìm các work item có ref_type='ARB', ref_id=null, status='pending'
    const cdvtAliases = [
      'transport_mechanic',
      'cdvt',
      'CĐVT',
      'CDVT',
      'cđvt',
      'PCĐVT',
      'pcđvt',
      'pcdvt',
    ];
    const phongCdvtPositions = await this.positionRepo.find({
      where: cdvtAliases.map((code) => ({ code })),
    });

    let userIds: string[] = [];
    // Nếu có transport_mechanic_id trên MSB thì chỉ tạo cho người này
    if (firstMsb?.transport_mechanic_id) {
      userIds = [firstMsb.transport_mechanic_id];
    } else if (phongCdvtPositions.length > 0) {
      const phongCdvtUsers = await this.userRepo.find({
        where: {
          position_id: In(phongCdvtPositions.map((p: any) => p.id)),
          status: 'active',
        },
      });
      userIds = phongCdvtUsers.map((u) => u.id);
    }
    for (const uid of userIds) {
      // Tìm work item chưa có ref_id
      let pendingWI = await this.workItemRepo.findOne({
        where: {
          user_id: uid,
          ref_type: 'ARB',
          status: 'pending',
          ref_id: null,
        },
      });
      if (pendingWI) {
        pendingWI.ref_id = arb.id;
        await this.workItemRepo.save(pendingWI);
      } else {
        // Nếu chưa có, tạo mới
        await this.workItemService.create(
          {
            user_id: uid,
            ref_type: 'ARB',
            ref_id: arb.id,
            task_type: 'create_ballot',
            task_name: 'Tạo phiếu nghiệm thu chạy thử sau sửa chữa',
            ballot_name:
              'BIÊN BẢN NGHIỆM THU CHẠY THỬ VÀ BÀN GIAO THIẾT BỊ SAU SỬA CHỮA',
            start_date: new Date(),
            status: 'pending',
          },
          createdByUserId,
        );
      }
    }
  }
}
