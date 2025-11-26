import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RepairRequestService {
  constructor(
    @InjectRepository(RepairRequest)
    private readonly repairRequestRepo: Repository<RepairRequest>,
  ) {}

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    from?: Date,
    to?: Date,
    sortOptions: {
      field: 'start_date' | 'equipment_name' | 'equipment_code';
      order: 'ASC' | 'DESC';
    }[] = [{ field: 'start_date', order: 'DESC' }],
  ) {
    const qb = this.repairRequestRepo
      .createQueryBuilder('rr')
      .leftJoinAndSelect('rr.equipment', 'equipment')
      .leftJoinAndSelect('rr.materialSupplyBallots', 'ballots');

    // Search
    if (search) {
      qb.andWhere(
        'LOWER(equipment.name) LIKE LOWER(:search) OR LOWER(equipment.code) LIKE LOWER(:search)',
        { search: `%${search}%` },
      );
    }

    // Filter date range
    if (from) {
      qb.andWhere('rr.start_date >= :from', { from });
    }
    if (to) {
      qb.andWhere('rr.start_date <= :to', { to });
    }

    // SORT nhiều field
    sortOptions.forEach((sort, index) => {
      const columnAlias =
        sort.field === 'start_date'
          ? 'rr.start_date'
          : sort.field === 'equipment_name'
            ? 'equipment.name'
            : 'equipment.code';

      if (index === 0) qb.orderBy(columnAlias, sort.order);
      else qb.addOrderBy(columnAlias, sort.order);
    });

    // Fallback sort
    qb.addOrderBy('rr.createdAt', 'DESC');

    // Pagination
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

  async getMaterialUsagesByMaterialId(
    materialId: string,
    page = 1,
    limit = 20,
  ): Promise<any> {
    const detailRepo = this.repairRequestRepo.manager.getRepository(
      MaterialSupplyBallotDetail,
    );

    // Query chính, group theo repairRequest + equipment
    const qb = detailRepo
      .createQueryBuilder('detail')
      .innerJoin('detail.materialSupplyBallot', 'ballot')
      .innerJoin('ballot.repairRequest', 'repairRequest')
      .innerJoin('repairRequest.equipment', 'equipment')
      .innerJoin('detail.material', 'material')
      .where('material.id = :materialId', { materialId })
      .select([
        'equipment.id AS equipment_id',
        'equipment.code AS equipment_code',
        'equipment.name AS equipment_name',
        'repairRequest.id AS repair_request_id',
      ])
      .groupBy('equipment.id')
      .addGroupBy('equipment.code')
      .addGroupBy('equipment.name')
      .addGroupBy('repairRequest.id')
      .orderBy('repairRequest.start_date', 'DESC');

    // Lấy tổng số bản ghi trước khi phân trang
    const total = (await qb.getRawMany()).length;

    // Phân trang
    qb.offset((page - 1) * limit).limit(limit);

    const rows = await qb.getRawMany();

    // Map ra JSON dễ đọc
    const items = rows.map((r) => ({
      equipment: {
        id: r.equipment_id,
        code: r.equipment_code,
        name: r.equipment_name,
      },
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMaterialUsageStatisticsSummary(
    fromDate?: Date,
    toDate?: Date,
    movement?: 'thu-hoi' | 'dung-lai' | 'thay-moi',
    page = 1,
    limit = 20,
    search?: string,
    sortBy: 'name' | 'code' | 'quantity' = 'name',
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): Promise<any> {
    const detailRepo = this.repairRequestRepo.manager.getRepository(
      MaterialSupplyBallotDetail,
    );

    const reasonMap = {
      'thu-hoi': ['Sửa chữa'],
      'dung-lai': ['Dùng lại'],
      'thay-moi': ['Thay mới'],
    };

    const reasons = movement ? reasonMap[movement] : undefined;

    // === COUNT TOTAL GROUPS ===
    const countResult = await detailRepo
      .createQueryBuilder('detail')
      .innerJoin('detail.materialSupplyBallot', 'ballot')
      .innerJoin('detail.material', 'material')
      .select('COUNT(DISTINCT material.id)', 'cnt')
      .where(
        fromDate && toDate ? 'ballot.createdAt BETWEEN :from AND :to' : '1=1',
        { from: fromDate, to: toDate },
      )
      .andWhere(reasons ? 'detail.reason IN (:...reasons)' : '1=1', { reasons })
      .andWhere(
        search
          ? '(material.name ILIKE :search OR material.code ILIKE :search)'
          : '1=1',
        { search: `%${search}%` },
      )
      .getRawOne();

    const total = Number(countResult?.cnt || 0);

    // === MAIN QUERY ===
    const qb = detailRepo
      .createQueryBuilder('detail')
      .innerJoin('detail.materialSupplyBallot', 'ballot')
      .innerJoin('detail.material', 'material')
      .select([
        'material.id AS material_id',
        'material.code AS material_code',
        'material.name AS material_name',
        'material.unit AS material_unit',
        'SUM(detail.quantity_supplies) AS total_quantity',
      ])
      .groupBy('material.id')
      .addGroupBy('material.code')
      .addGroupBy('material.name')
      .addGroupBy('material.unit');

    if (fromDate && toDate) {
      qb.andWhere('ballot.createdAt BETWEEN :from AND :to', {
        from: fromDate,
        to: toDate,
      });
    }

    if (reasons) {
      qb.andWhere('detail.reason IN (:...reasons)', { reasons });
    }

    if (search) {
      qb.andWhere(
        '(material.name ILIKE :search OR material.code ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // === SORT ===
    const sortColumn =
      sortBy === 'quantity' ? 'total_quantity' : `material.${sortBy}`;
    qb.orderBy(sortColumn, sortOrder);

    // === PAGINATION ===
    qb.offset((page - 1) * limit).limit(limit);

    const rows = await qb.getRawMany();

    return {
      items: rows.map((r) => ({
        material: {
          id: r.material_id,
          code: r.material_code,
          name: r.material_name,
          unit: r.material_unit,
        },
        totalQuantity: Number(r.total_quantity) || 0,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRepairRequestBallots(repairRequestId: string): Promise<
    Array<{
      type: string;
      id: string;
      name: string | null;
      status: string | null;
      createdAt: string | null;
    }>
  > {
    const repairRequest = await this.repairRequestRepo.findOne({
      where: { id: repairRequestId },
      relations: [
        'technicalAppraisalBallot',
        'detailAppraisalBallot',
        'assignmentBallot',
        'acceptanceRepairBallot',
        'settlementRepairBallot',
        'qualityAssessmentBallot',
      ],
    });

    if (!repairRequest) {
      return [];
    }

    const manager = this.repairRequestRepo.manager;
    const msbRepo = manager.getRepository(MaterialSupplyBallot);

    const msbItems = await msbRepo
      .createQueryBuilder('msb')
      .where('msb.repair_request_id = :repairRequestId', { repairRequestId })
      .andWhere('msb.is_merged = :isMerged', { isMerged: false })
      .orderBy('msb.createdAt', 'ASC')
      .getMany();

    const ballots: Array<{
      type: string;
      id: string;
      name: string | null;
      status: string | null;
      createdAt: string | null;
    }> = [];

    // Thêm các phiếu MSB gốc
    for (const b of msbItems) {
      ballots.push({
        type: 'MSB',
        id: b.id,
        name: b.name ?? null,
        status: b.status ?? null,
        createdAt: b.createdAt ? b.createdAt.toISOString() : null,
      });
    }

    const singleBallots: Array<{
      type: string;
      ballot: any;
    }> = [
      { type: 'TAB', ballot: repairRequest.technicalAppraisalBallot },
      { type: 'DAB', ballot: repairRequest.detailAppraisalBallot },
      { type: 'ASB', ballot: repairRequest.assignmentBallot },
      { type: 'ARB', ballot: repairRequest.acceptanceRepairBallot },
      { type: 'SRB', ballot: repairRequest.settlementRepairBallot },
      { type: 'QAB', ballot: repairRequest.qualityAssessmentBallot },
    ];

    for (const { type, ballot } of singleBallots) {
      if (ballot) {
        ballots.push({
          type,
          id: ballot.id,
          name: ballot.name ?? null,
          status: ballot.status ?? null,
          createdAt: ballot.createdAt ? ballot.createdAt.toISOString() : null,
        });
      }
    }

    return ballots;
  }

  private toDto(repairRequest: RepairRequest) {
    return {
      id: repairRequest.id,
      equipment: {
        code: repairRequest.equipment.code,
        name: repairRequest.equipment.name,
      },
      start_date: repairRequest.start_date,
      end_date: repairRequest.end_date,
      status: repairRequest.status,
    };
  }
}
