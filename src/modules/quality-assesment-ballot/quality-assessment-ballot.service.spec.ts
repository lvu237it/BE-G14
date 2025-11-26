import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import { SettlementRepairBallot } from 'src/entities/settlement-repair-ballot.entity';
import { Department, Position, User } from 'src/entities';
import { WorkItemService } from '../work-item/work-item.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QualityAssessmentBallotService } from './quality-assesment-ballot.service';

const createMockRepo = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  })),
  manager: {
    create: jest.fn(),
    remove: jest.fn(),
  },
});

const mockWorkItemService = {
  create: jest.fn(),
  completeByRef: jest.fn(),
};

describe('QualityAssessmentBallotService', () => {
  let service: QualityAssessmentBallotService;
  let qabRepo: jest.Mocked<Repository<QualityAssessmentBallot>>;
  let settleRepo: jest.Mocked<Repository<SettlementRepairBallot>>;
  let depRepo: jest.Mocked<Repository<Department>>;
  let posRepo: jest.Mocked<Repository<Position>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let workItemService: jest.Mocked<WorkItemService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QualityAssessmentBallotService,
        { provide: getRepositoryToken(QualityAssessmentBallot), useFactory: createMockRepo },
        { provide: getRepositoryToken(SettlementRepairBallot), useFactory: createMockRepo },
        { provide: getRepositoryToken(User), useFactory: createMockRepo },
        { provide: getRepositoryToken(Department), useFactory: createMockRepo },
        { provide: getRepositoryToken(Position), useFactory: createMockRepo },
        { provide: WorkItemService, useValue: mockWorkItemService },
      ],
    }).compile();

    service = module.get(QualityAssessmentBallotService);
    qabRepo = module.get(getRepositoryToken(QualityAssessmentBallot));
    settleRepo = module.get(getRepositoryToken(SettlementRepairBallot));
    depRepo = module.get(getRepositoryToken(Department));
    posRepo = module.get(getRepositoryToken(Position));
    userRepo = module.get(getRepositoryToken(User));
    workItemService = module.get(WorkItemService) as jest.Mocked<WorkItemService>;
  });

  afterEach(() => jest.clearAllMocks());

  // === FIND ALL ===
  describe('findAll', () => {
    it('should return paginated data', async () => {
      (qabRepo.createQueryBuilder as any).mockReturnValueOnce({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: '1', name: 'test' }], 1]),
      });

      const result = await service.findAll(1, 10);
      expect(result.total).toBe(1);
      expect(result.items[0].name).toBe('test');
    });
  });

  // === FIND ONE ===
  describe('findOne', () => {
    it('should throw NotFound if missing', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });

    it('should return dto if found', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1', name: 'QAB' } as any);
      const res = await service.findOne('1');
      expect(res.id).toBe('1');
    });
  });

  // === CREATE ===
  describe('create', () => {


    it('should create and save entity', async () => {
      qabRepo.create.mockReturnValue({ id: '1' } as any);
      qabRepo.save.mockResolvedValue({ id: '1', name: 'ok' } as any);
      const dto = { name: 'phiếu', items: [{ material_id: '1' }] };
      const res = await service.create(dto as any);
      expect(res.id).toBe('1');
    });
  });

  // === APPROVE ===
  describe('approve', () => {
    it('should throw NotFound if not found', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.approve('id', 'user')).rejects.toThrow(NotFoundException);
    });

    it('should update status and call workItemService', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1', status: 'pending' } as any);
      qabRepo.save.mockResolvedValue({ id: '1', status: 'in_progress' } as any);

      const result = await service.approve('1', { id: 'u1' } as any);
      expect(result.status).toBe('in_progress');
      expect(workItemService.create).toHaveBeenCalled();
    });
  });

  // === REJECT ===
  describe('reject', () => {
    it('should throw NotFound if not exist', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.reject('id', {})).rejects.toThrow(NotFoundException);
    });

    it('should update status to pending and create work item', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1' } as any);
      qabRepo.save.mockResolvedValue({ id: '1', status: 'pending' } as any);

      const result = await service.reject('1', { id: 'u1' } as any);
      expect(result.status).toBe('pending');
      expect(workItemService.create).toHaveBeenCalled();
    });
  });

  // === UPDATE ITEMS ===
  describe('updateItems', () => {
    it('should throw NotFound if QAB not found', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.updateItems('1', { items: [] }, {})).rejects.toThrow(NotFoundException);
    });

    it('should remove old items and create new ones', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1', items: [] } as any);
      (qabRepo.manager.create as any).mockReturnValue({});
      qabRepo.save.mockResolvedValue({ id: '1' } as any);
      const res = await service.updateItems('1', { items: [{ material_id: '1' }] }, { id: 'u1' });
      expect(res.id).toBe('1');
      expect(workItemService.create).toHaveBeenCalled();
    });
  });

  // === FINAL APPROVE ===
  describe('finalApprove', () => {
    it('should throw NotFound if missing', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.finalApprove('id', 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw if missing signatures', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1', deputy_director_id: null } as any);
      await expect(service.finalApprove('1', 'user')).rejects.toThrow(BadRequestException);
    });

    it('should approve and create settlement', async () => {
      qabRepo.findOne.mockResolvedValue({
        id: '1',
        name: 'QAB',
        deputy_director_id: 'a',
        lead_finance_accounting_id: 'b',
        lead_first_plan: 'c',
        lead_transport_mechanic: 'd',
        equipment_id: 'eq',
      } as any);
      qabRepo.save.mockResolvedValue({ id: '1', status: 'approved' } as any);
      settleRepo.create.mockReturnValue({ id: 's1' } as any);
      settleRepo.save.mockResolvedValue({ id: 's1' } as any);
      depRepo.findOne.mockResolvedValue({ id: 'dep1' } as any);
      posRepo.findOne.mockResolvedValue({ id: 'pos1', department: { id: 'dep1' } } as any);
      userRepo.findOne.mockResolvedValue({ id: 'u1' } as any);

      const res = await service.finalApprove('1', { id: 'approver' } as any);
      expect(res.status).toBe('approved');
      expect(workItemService.create).toHaveBeenCalled();
    });
  });

  // === APPROVE CREATE ===
  describe('approveCreate', () => {
    it('should throw NotFound if not found', async () => {
      qabRepo.findOne.mockResolvedValue(null as any);
      await expect(service.approveCreate('id', { items: [] }, {})).rejects.toThrow(NotFoundException);
    });

    it('should create work item and update statusButton', async () => {
      qabRepo.findOne.mockResolvedValue({ id: '1', items: [] } as any);
      qabRepo.save.mockResolvedValue({ id: '1', statusButton: 'created' } as any);

      const res = await service.approveCreate('1', { items: [{ material_id: 'a' }] }, { id: 'user' });
      expect(res.statusButton).toBe('created');
      expect(workItemService.create).toHaveBeenCalled();
    });
  });
});
