import { Test, TestingModule } from '@nestjs/testing';
import { HistoryRepairService } from './history-repair.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { 
  MaterialSupplyBallot, 
  MaterialSupplyBallotDetail, 
  Equipment, 
  TechnicalAppraisalBallot,
  DetailAppraisalBallot,
} from 'src/entities';
import { HistoryRepair } from 'src/entities/history-repair.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';

const mockQueryBuilder = () => {
  const qb: any = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getQuery: jest.fn().mockReturnValue('SELECT 1'),
  };
  return qb;
};

const mockRepo = () => ({
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

describe('HistoryRepairService - reportEquipment', () => {
  let service: HistoryRepairService;
  let historyRepo: jest.Mocked<Repository<HistoryRepair>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryRepairService,
        { provide: getRepositoryToken(HistoryRepair), useValue: mockRepo() },
        { provide: getRepositoryToken(MaterialSupplyBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(MaterialSupplyBallotDetail), useValue: mockRepo() },
        { provide: getRepositoryToken(RepairRequest), useValue: mockRepo() },
        { provide: getRepositoryToken(Equipment), useValue: mockRepo() },
        { provide: getRepositoryToken(TechnicalAppraisalBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(DetailAppraisalBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(AssignmentBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(AcceptanceRepairBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(SettlementRepairBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(QualityAssessmentBallot), useValue: mockRepo() },
      ],
    }).compile();

    service = module.get<HistoryRepairService>(HistoryRepairService);
    historyRepo = module.get(getRepositoryToken(HistoryRepair));
  });

  it('should return paginated report with correct structure', async () => {
    const mockItems = [
      {
        equipment_id: 'eq1',
        equipment_name: 'Equipment 1',
        equipment_code: 'E001',
        unit: 'pcs',
        location_name: 'Location A',
        repair_count: 5,
        created_at: new Date(),
        updated_at: new Date(),
        repair_percent: 50,
      },
    ];

    const qb = mockQueryBuilder();
    qb.getRawMany
      .mockResolvedValueOnce(mockItems) // totalQuery
      .mockResolvedValueOnce(mockItems); // main query

    historyRepo.createQueryBuilder.mockReturnValue(qb as any);

    const result = await service.reportEquipment(1, 20);

    expect(historyRepo.createQueryBuilder).toHaveBeenCalledWith('ballot');
    expect(result).toEqual({
      items: mockItems,
      total: mockItems.length,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    expect(qb.leftJoin).toHaveBeenCalled();
    expect(qb.andWhere).toHaveBeenCalled();
    expect(qb.select).toHaveBeenCalled();
    expect(qb.groupBy).toHaveBeenCalled();
    expect(qb.addGroupBy).toHaveBeenCalled();
    expect(qb.orderBy).toHaveBeenCalled();
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);
  });

  it('should apply from and to date filters', async () => {
    const from = new Date('2025-11-01');
    const to = new Date('2025-11-31');

    const qb = mockQueryBuilder();
    qb.getRawMany.mockResolvedValue([]);
    historyRepo.createQueryBuilder.mockReturnValue(qb as any);

    await service.reportEquipment(1, 10, from, to);

    expect(qb.andWhere).toHaveBeenCalledWith('ballot.updatedAt >= :from', { from });
    expect(qb.andWhere).toHaveBeenCalledWith('ballot.updatedAt <= :to', { to });
  });

 it('should handle empty result with from and to date', async () => {
  const from = new Date('2025-10-01');
  const to = new Date('2025-10-30');

  const qb = mockQueryBuilder();
  qb.getRawMany.mockResolvedValue([]); // kết quả rỗng
  historyRepo.createQueryBuilder.mockReturnValue(qb as any);

  const result = await service.reportEquipment(1, 10, from, to);

  // Kiểm tra từ và đến date được gọi trong query
  expect(qb.andWhere).toHaveBeenCalledWith('ballot.updatedAt >= :from', { from });
  expect(qb.andWhere).toHaveBeenCalledWith('ballot.updatedAt <= :to', { to });

  // Kết quả trả về vẫn rỗng
  expect(result.items).toEqual([]);
  expect(result.total).toBe(0);
  expect(result.totalPages).toBe(0);
});

});
