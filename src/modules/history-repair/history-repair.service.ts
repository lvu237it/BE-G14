import { Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as ExcelJS from 'exceljs';
import { HistoryRepairSortOptionDto } from 'src/common/interfaces/dto/material-supply-ballot.dto';
import { PaginatedResponse } from 'src/common/interfaces/response/api-response.interface';
import {
  getNowVietnamTime,
  toVietnamTime,
} from 'src/common/utils/timezone.util';
import { Equipment } from 'src/entities';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { HistoryRepair } from 'src/entities/history-repair.entity';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { Repository } from 'typeorm';
@Injectable()
export class HistoryRepairService {
  constructor(
    @InjectRepository(HistoryRepair)
    private readonly repo: Repository<HistoryRepair>,
    @InjectRepository(MaterialSupplyBallot)
    private readonly msbRepo: Repository<MaterialSupplyBallot>,
    @InjectRepository(MaterialSupplyBallotDetail)
    private readonly msbDetailRepo: Repository<MaterialSupplyBallotDetail>,
    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(TechnicalAppraisalBallot)
    private readonly tabRepo: Repository<TechnicalAppraisalBallot>,
    @InjectRepository(DetailAppraisalBallot)
    private readonly dabRepo: Repository<DetailAppraisalBallot>,
    @InjectRepository(AssignmentBallot)
    private readonly asbRepo: Repository<AssignmentBallot>,
    @InjectRepository(AcceptanceRepairBallot)
    private readonly arbRepo: Repository<AcceptanceRepairBallot>,
    @InjectRepository(SettlementRepairBallot)
    private readonly srbRepo: Repository<SettlementRepairBallot>,
    @InjectRepository(QualityAssessmentBallot)
    private readonly qabRepo: Repository<QualityAssessmentBallot>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    status?: 'pending' | 'done',
    start_date?: string,
    end_date?: string,
    sortOptions: HistoryRepairSortOptionDto[] = [
      { field: 'start_date', order: 'DESC' },
    ],
  ): Promise<PaginatedResponse<any>> {
    const qb = this.repo
      .createQueryBuilder('hr')
      .leftJoinAndSelect('hr.equipment', 'equipment')
      .leftJoinAndSelect('hr.technicalAppraisalBallot', 'tab')
      .leftJoinAndSelect('hr.detailAppraisalBallot', 'dab')
      .leftJoinAndSelect('hr.assignmentBallot', 'asb')
      .leftJoinAndSelect('hr.acceptanceRepairBallot', 'arb')
      .leftJoinAndSelect('hr.settlementRepairBallot', 'srb')
      .leftJoinAndSelect('hr.qualityAssessmentBallot', 'qab')
      .leftJoinAndSelect('hr.materialSupplyBallot', 'msb');

    if (status) {
      qb.andWhere('hr.status = :status', { status });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(equipment.name) LIKE LOWER(:search) OR LOWER(equipment.code) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (start_date) {
      qb.andWhere('hr.start_date >= :start_date', { start_date });
    }

    if (end_date) {
      qb.andWhere('hr.start_date <= :end_date', { end_date });
    }

    sortOptions.forEach((sort, index) => {
      let column = '';

      switch (sort.field) {
        case 'equipment_name':
          column = 'equipment.name';
          break;
        case 'equipment_code':
          column = 'equipment.code';
          break;
        case 'end_date':
          column = 'hr.end_date';
          break;
        case 'start_date':
        default:
          column = 'hr.start_date';
          break;
      }

      if (index === 0) qb.orderBy(column, sort.order);
      else qb.addOrderBy(column, sort.order);
    });

    // fallback sort nếu thiếu
    qb.addOrderBy('hr.createdAt', 'DESC');

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((item) => this.toDto(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toDto(item: HistoryRepair): any {
    return {
      id: item.id,
      start_date: item.start_date,
      end_date: item.end_date,
      equipment: item.equipment
        ? {
            id: item.equipment.id,
            code: item.equipment.code,
            name: item.equipment.name,
            status: item.equipment.status,
          }
        : null,
    };
  }

  async addBallotToHistory(
    equipmentId: string,
    ballotType: 'TAB' | 'DAB' | 'ASB' | 'ARB' | 'SRB' | 'QAB',
    ballotId: string,
  ): Promise<HistoryRepair> {
    if (!equipmentId || !ballotId)
      throw new Error('Missing equipmentId or ballotId');

    // Prefer latest non-done history for this equipment
    let history = await this.repo.findOne({
      where: { equipment_id: equipmentId },
      order: { createdAt: 'DESC' },
    });

    if (!history) {
      history = this.repo.create({
        equipment_id: equipmentId,
        status: 'pending',
      });
    }

    switch (ballotType) {
      case 'TAB':
        history.technical_appraisal_ballot_id = ballotId;
        break;
      case 'DAB':
        history.detail_appraisal_ballot_id = ballotId;
        break;
      case 'ASB':
        history.assignment_ballot_id = ballotId;
        break;
      case 'ARB':
        history.acceptance_repair_id = ballotId;
        break;
      case 'SRB':
        history.settlement_repair_ballot_id = ballotId;
        break;
      case 'QAB':
        history.quality_assessment_ballot_id = ballotId;
        break;
    }

    const saved = await this.repo.save(history);

    // Reload with relations to check statuses
    const reloaded = await this.repo.findOne({
      where: { id: saved.id },
      relations: [
        'technicalAppraisalBallot',
        'detailAppraisalBallot',
        'assignmentBallot',
        'acceptanceRepairBallot',
        'settlementRepairBallot',
        'qualityAssessmentBallot',
      ],
    });

    if (reloaded) {
      await this.ensureHistoryDates(reloaded, equipmentId);
    }

    const allExist =
      reloaded.technicalAppraisalBallot &&
      reloaded.detailAppraisalBallot &&
      reloaded.assignmentBallot &&
      reloaded.acceptanceRepairBallot &&
      reloaded.settlementRepairBallot &&
      reloaded.qualityAssessmentBallot;

    const allFinish =
      allExist &&
      (reloaded.technicalAppraisalBallot as any).status === 'done' &&
      (reloaded.detailAppraisalBallot as any).status === 'done' &&
      (reloaded.assignmentBallot as any).status === 'done' &&
      (reloaded.acceptanceRepairBallot as any).status === 'done' &&
      (reloaded.settlementRepairBallot as any).status === 'approved' &&
      (reloaded.qualityAssessmentBallot as any).status === 'approved';

    if (allFinish && reloaded.status !== 'done') {
      reloaded.status = 'done';

      // ========== TÍNH start_date VÀ end_date ==========
      // start_date: Ngày phiếu xin cấp vật tư đầu tiên được duyệt (status: 'in_progress')
      // end_date: Ngày khi tất cả phiếu đã done/approved (hiện tại)
      const repairRequest = await this.repairRequestRepo.findOne({
        where: { equipment_id: equipmentId },
        order: { createdAt: 'DESC' },
      });

      if (repairRequest) {
        // Lấy tất cả MSB trong repair_request này, sắp xếp theo createdAt ASC
        const allMsbsForDates = await this.msbRepo.find({
          where: { repair_request_id: (repairRequest as any).id },
          order: { createdAt: 'ASC' },
        });

        let start_date = reloaded.start_date ?? null;
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

        reloaded.start_date = start_date;
        reloaded.end_date = end_date;

        await this.repo.save(reloaded);

        // Gộp phiếu xin cấp vật tư
        await this.checkAndMergeMSBs(repairRequest.id, equipmentId);

        // Cập nhật status RepairRequest sang done
        repairRequest.status = 'done';
        await this.repairRequestRepo.save(repairRequest);

        // Cập nhật status thiết bị sang active
        await this.equipmentRepo.update(
          { id: repairRequest.equipment_id },
          { status: 'active' },
        );
      }
    }

    return saved;
  }

  private async ensureHistoryDates(
    history: HistoryRepair,
    equipmentId: string,
  ): Promise<void> {
    let hasChanges = false;

    if (!history.start_date) {
      const firstMsb = await this.msbRepo.findOne({
        where: { equipment_id: equipmentId },
        order: { createdAt: 'ASC' },
      });

      if (firstMsb) {
        const rawDate = firstMsb.updatedAt || firstMsb.createdAt;
        history.start_date = toVietnamTime(rawDate) || rawDate;
        hasChanges = true;
      }
    }

    const hasAllBallots =
      !!history.technical_appraisal_ballot_id &&
      !!history.detail_appraisal_ballot_id &&
      !!history.assignment_ballot_id &&
      !!history.acceptance_repair_id &&
      !!history.settlement_repair_ballot_id &&
      !!history.quality_assessment_ballot_id;

    if (hasAllBallots && !history.end_date) {
      history.end_date = getNowVietnamTime();
      hasChanges = true;
    }

    if (hasChanges) {
      await this.repo.save(history);
    }
  }
  async checkAndMergeMSBs(
    repairRequestId: string,
    equipmentId: string,
  ): Promise<void> {
    try {
      // 1. Lấy tất cả MSB của repair request
      const allMsbs = await this.msbRepo.find({
        where: { repair_request_id: repairRequestId },
        relations: ['details'],
        order: { createdAt: 'ASC' },
      });

      if (!allMsbs || allMsbs.length === 0) return;

      // 2. Nếu chỉ có 1 phiếu → không gộp, chỉ gán vào HistoryRepair
      if (allMsbs.length === 1) {
        const latestHistory = await this.repo.findOne({
          where: { equipment_id: equipmentId },
          order: { createdAt: 'DESC' },
        });

        if (latestHistory) {
          latestHistory.material_supply_ballot_id = allMsbs[0].id;
          await this.repo.save(latestHistory);
        }
        return;
      }

      // 3. Gộp tất cả details từ các phiếu cũ
      const detailsMap = new Map<
        string,
        {
          material_id: string;
          quantity_approve: number;
          quantity_supplies: number;
          reason?: string | null;
          notes?: string | null;
        }
      >();

      for (const msb of allMsbs) {
        for (const detail of msb.details ?? []) {
          const key = detail.material_id;
          if (!key) continue;

          if (detailsMap.has(key)) {
            const existing = detailsMap.get(key)!;
            existing.quantity_approve += Number(detail.quantity_approve ?? 0);
            existing.quantity_supplies += Number(detail.quantity_supplies ?? 0);
          } else {
            detailsMap.set(key, {
              material_id: key,
              quantity_approve: Number(detail.quantity_approve ?? 0),
              quantity_supplies: Number(detail.quantity_supplies ?? 0),
              reason: detail.reason ?? null,
              notes: detail.notes ?? null,
            });
          }
        }
      }

      // 4. Tạo phiếu gộp mới
      const mergedMsb = new MaterialSupplyBallot();
      Object.assign(mergedMsb, {
        name: `[Gộp từ ${allMsbs.length} phiếu] ${allMsbs[0].name.split(' - ')[0] || 'Phiếu xin cấp vật tư'}`,
        equipment_id: equipmentId,
        level_repair: allMsbs[0].level_repair,
        technical_status: allMsbs[0].technical_status,
        reason: allMsbs[0].reason,
        solution: allMsbs[0].solution,
        status: 'done' as const,
        repair_request_id: repairRequestId,
        lead_warehouse_id: allMsbs[0].lead_warehouse_id,
        receiver_id: allMsbs[0].receiver_id,
        transport_mechanic_id: allMsbs[0].transport_mechanic_id,
        deputy_foreman_id: allMsbs[0].deputy_foreman_id,
        equipment_manager_id: allMsbs[0].equipment_manager_id,
        notes: 'Phiếu được tự động gộp từ các phiếu xin cấp vật tư riêng lẻ',
        isMerged: true,
        createdBy: 'system',
        updatedBy: 'system',
      });

      // 5. Lưu phiếu gộp
      const savedMergedMsb: MaterialSupplyBallot =
        await this.msbRepo.save(mergedMsb);

      // 6. Tạo chi tiết cho phiếu gộp
      if (detailsMap.size > 0) {
        const newDetails: MaterialSupplyBallotDetail[] = [];

        for (const d of detailsMap.values()) {
          const detail = new MaterialSupplyBallotDetail();
          Object.assign(detail, {
            materialSupplyBallot: savedMergedMsb,
            material_id: d.material_id,
            quantity_approve: d.quantity_approve,
            quantity_supplies: d.quantity_supplies,
            reason: d.reason ?? null,
            notes: d.notes ?? null,
            createdBy: 'system',
            updatedBy: 'system',
          });
          newDetails.push(detail);
        }

        await this.msbDetailRepo.save(newDetails);
      }

      // 7. Cập nhật HistoryRepair trỏ đến phiếu gộp
      const latestHistory = await this.repo.findOne({
        where: { equipment_id: equipmentId },
        order: { createdAt: 'DESC' },
      });

      if (latestHistory) {
        latestHistory.material_supply_ballot_id = savedMergedMsb.id;
        await this.repo.save(latestHistory);
      }
    } catch (err) {
      console.error(
        `Error merging MSBs for repair_request ${repairRequestId}:`,
        err,
      );
    }
  }

  async addBallotToRepairRequest(
    repairRequestId: string,
    ballotType: 'TAB' | 'DAB' | 'ASB' | 'ARB' | 'SRB' | 'QAB',
    ballotId: string,
  ): Promise<RepairRequest> {
    if (!repairRequestId || !ballotId)
      throw new Error('Missing repairRequestId or ballotId');

    const rr = await this.repairRequestRepo.findOne({
      where: { id: repairRequestId as any },
    });

    if (!rr) {
      throw new Error(`RepairRequest ${repairRequestId} không tồn tại`);
    }

    switch (ballotType) {
      case 'TAB':
        rr.technical_appraisal_ballot_id = ballotId;
        break;
      case 'DAB':
        rr.detail_appraisal_ballot_id = ballotId;
        break;
      case 'ASB':
        rr.assignment_ballot_id = ballotId;
        break;
      case 'ARB':
        rr.acceptance_repair_id = ballotId;
        break;
      case 'SRB':
        rr.settlement_repair_ballot_id = ballotId;
        break;
      case 'QAB':
        rr.quality_assessment_ballot_id = ballotId;
        break;
    }

    return await this.repairRequestRepo.save(rr);
  }

  async findOne(id: string): Promise<any> {
    const history = await this.repo.findOne({
      where: { id: id as any },
      relations: ['equipment'],
    });

    if (!history) {
      throw new NotFoundException('Không tìm thấy lịch sử sửa chữa');
    }

    const result: any = {
      id: history.id,
      start_date: history.start_date,
      end_date: history.end_date,
      equipment: history.equipment
        ? {
            id: history.equipment.id,
            code: history.equipment.code,
            name: history.equipment.name,
            status: history.equipment.status,
          }
        : null,
      ballots: [],
    };

    // cấu hình các loại repo và key
    const ballotConfigs = [
      {
        key: 'technical_appraisal_ballot_id',
        repo: this.tabRepo,
        type: 'TAB',
      },
      {
        key: 'detail_appraisal_ballot_id',
        repo: this.dabRepo,
        type: 'DAB',
      },
      {
        key: 'assignment_ballot_id',
        repo: this.asbRepo,
        type: 'ASB',
      },
      {
        key: 'acceptance_repair_id',
        repo: this.arbRepo,
        type: 'ARB',
      },
      {
        key: 'settlement_repair_ballot_id',
        repo: this.srbRepo,
        type: 'SRB',
      },
      {
        key: 'quality_assessment_ballot_id',
        repo: this.qabRepo,
        type: 'QAB',
      },
      {
        key: 'material_supply_ballot_id',
        repo: this.msbRepo,
        type: 'MSB',
      },
    ];

    // chạy một vòng để load các phiếu
    for (const config of ballotConfigs) {
      const ballotId = (history as any)[config.key];

      if (ballotId) {
        const ballot = await config.repo.findOne({
          where: { id: ballotId },
          select: ['id', 'name', 'status', 'createdAt'],
        });

        if (ballot) {
          result.ballots.push({
            type: config.type,
            id: ballot.id,
            name: ballot.name,
            status: ballot.status,
            createdAt: ballot.createdAt,
          });
        }
      }
    }

    return result;
  }

  async reportEquipment(
    page = 1,
    limit = 20,
    from?: Date,
    to?: Date,
    search?: string,
    sortOptions: {
      field: 'name' | 'code' | 'repair_count';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'name', order: 'ASC' }],
  ): Promise<PaginatedResponse<any>> {
    const baseQuery = this.repo
      .createQueryBuilder('ballot')
      .leftJoin('ballot.equipment', 'equipment')
      .leftJoin('equipment.location', 'location')
      .andWhere('ballot.equipment_id IS NOT NULL');

    if (search) {
      baseQuery.andWhere(
        '(LOWER(equipment.name) LIKE :search OR LOWER(equipment.code) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (from) baseQuery.andWhere('ballot.updatedAt >= :from', { from });
    if (to) baseQuery.andWhere('ballot.updatedAt <= :to', { to });

    const totalRepairsSubquery = this.repo
      .createQueryBuilder('b')
      .select('COUNT(b.id)')
      .where('b.equipment_id IS NOT NULL');

    if (from) totalRepairsSubquery.andWhere('b.updatedAt >= :from', { from });
    if (to) totalRepairsSubquery.andWhere('b.updatedAt <= :to', { to });

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
      .addGroupBy('location.name');

    // SORT nhiều field
    sortOptions.forEach((sort, index) => {
      const columnAlias =
        sort.field === 'name'
          ? 'equipment_name'
          : sort.field === 'code'
            ? 'equipment_code'
            : 'repair_count';

      if (index === 0) query.orderBy(columnAlias, sort.order);
      else query.addOrderBy(columnAlias, sort.order);
    });

    const totalQuery = query.clone();
    const total = (await totalQuery.getRawMany()).length;

    query.skip((page - 1) * limit).take(limit);

    const items = await query.getRawMany();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportReportEquipmentExcel(
    from?: Date,
    to?: Date,
    search?: string,
    sortOptions: {
      field: 'name' | 'code' | 'repair_count';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'name', order: 'ASC' }],
  ): Promise<StreamableFile> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Báo cáo thiết bị');

    // Header
    sheet.columns = [
      { header: 'Tên thiết bị', key: 'equipment_name', width: 30 },
      { header: 'Mã thiết bị', key: 'equipment_code', width: 20 },
      { header: 'Đơn vị', key: 'unit', width: 15 },
      { header: 'Vị trí', key: 'location_name', width: 25 },
      { header: 'Số lần sửa chữa', key: 'repair_count', width: 20 },
      { header: '% Tỷ lệ sửa chữa', key: 'repair_percent', width: 20 },
      { header: 'Ngày sửa đầu tiên', key: 'created_at', width: 20 },
      { header: 'Ngày sửa gần nhất', key: 'updated_at', width: 20 },
    ];

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E5E5' },
      };
    });

    // LẤY DỮ LIỆU BÁO CÁO
    const result = await this.reportEquipment(
      1,
      999999, // export tất cả
      from,
      to,
      search,
      sortOptions,
    );

    // Đổ dữ liệu vào excel
    for (const row of result.items) {
      sheet.addRow({
        equipment_name: row.equipment_name,
        equipment_code: row.equipment_code,
        unit: row.unit,
        location_name: row.location_name,
        repair_count: row.repair_count,
        repair_percent: row.repair_percent + '%',
        created_at: row.created_at
          ? new Date(row.created_at).toISOString().split('T')[0]
          : '',
        updated_at: row.updated_at
          ? new Date(row.updated_at).toISOString().split('T')[0]
          : '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new StreamableFile(new Uint8Array(buffer), {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: 'attachment; filename="report_equipment.xlsx"',
    });
  }
}
