import { Test, TestingModule } from '@nestjs/testing';
import { AcceptanceRepairBallotService } from './acceptance-repair-ballot.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaterialSupplyBallot, User } from 'src/entities';
import { WorkItemService } from '../work-item/work-item.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { QualityAssessmentBallot } from 'src/entities/quality-assessment-ballot.entity';
import * as signMapModule from 'src/common/constants/position_map';

const mockRepo = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockWorkItemService = () => ({
  create: jest.fn(),
  completeByRef: jest.fn(),
});

describe('AcceptanceRepairBallotService', () => {
  let service: AcceptanceRepairBallotService;
  let arbRepo: jest.Mocked<Repository<AcceptanceRepairBallot>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let msbRepo: jest.Mocked<Repository<MaterialSupplyBallot>>;
  let qaRepo: jest.Mocked<Repository<QualityAssessmentBallot>>;
  let workItemService: jest.Mocked<WorkItemService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptanceRepairBallotService,
        { provide: getRepositoryToken(AcceptanceRepairBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        { provide: getRepositoryToken(MaterialSupplyBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(QualityAssessmentBallot), useValue: mockRepo() },
        { provide: WorkItemService, useValue: mockWorkItemService() },
      ],
    }).compile();

    service = module.get(AcceptanceRepairBallotService);
    arbRepo = module.get(getRepositoryToken(AcceptanceRepairBallot));
    userRepo = module.get(getRepositoryToken(User));
    msbRepo = module.get(getRepositoryToken(MaterialSupplyBallot));
    qaRepo = module.get(getRepositoryToken(QualityAssessmentBallot));
    workItemService = module.get(WorkItemService);
  });

  // ====================== findOne ======================
  describe('findOne', () => {
    it('should return ballot if found', async () => {
      const mockBallot = {
        id: '1',
        name: 'ARB 1',
        operatorUser: { id: 'u1', firstname: 'A', lastname: 'B' },
      } as any;
      arbRepo.findOne.mockResolvedValue(mockBallot);

      const result = await service.findOne('1');
      expect(result).toEqual(expect.objectContaining({ id: '1', name: 'ARB 1' }));
      expect(arbRepo.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: expect.any(Array),
      });
    });

    it('should throw NotFoundException if not found', async () => {
      arbRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });
  });

  // ====================== sign ======================
  describe('sign', () => {
    beforeEach(() => {
      Object.assign(signMapModule.acceptainceRepairBallotSignMap, {
        operator: 'operator_id',
        tt: 'operator_id',
        qd: 'equipment_manager_id',
        pqd: 'repairman_id',
        cdvt: 'transport_mechanic_id',
      });
    });

    const mockBallotWithRelations = {
      id: '1',
      operator_id: null,
      repairman_id: null,
      equipment_manager_id: null,
      transport_mechanic_id: null,
      name: 'ARB Test',
      equipment_id: 'eq1',
      operatorUser: { id: 'op1', firstname: 'Op', lastname: 'User', department: { id: 'd1', name: 'Dep' }, position: { id: 'p1', name: 'Operator', code: 'operator' } },
      equipmentManager: { id: 'em1', firstname: 'EM', lastname: 'Manager', department: { id: 'd1', name: 'Dep' }, position: { id: 'p2', name: 'Manager', code: 'qd' } },
      repairmanUser: { id: 'rm1', firstname: 'RM', lastname: 'Repair', department: { id: 'd2', name: 'Dep2' }, position: { id: 'p3', name: 'Repair', code: 'pqd' } },
      transportUser: { id: 'tr1', firstname: 'TR', lastname: 'Trans', department: { id: 'd3', name: 'Dep3' }, position: { id: 'p4', name: 'Transport', code: 'cdvt' } },
    } as any;

    it('should throw NotFoundException if ballot not found', async () => {
      arbRepo.findOne.mockResolvedValue(null);
      await expect(service.sign('1', { id: 'user1', position: { code: 'operator' } })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user has no position', async () => {
      arbRepo.findOne.mockResolvedValue(mockBallotWithRelations);
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.sign('1', { id: 'user1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if field already signed', async () => {
      const signedBallot = { ...mockBallotWithRelations, operator_id: 'op1' };
      arbRepo.findOne.mockResolvedValue(signedBallot);
      await expect(service.sign('1', { id: 'user2', position: { code: 'operator' } })).rejects.toThrow(BadRequestException);
    });

    it('should sign a single role successfully', async () => {
      arbRepo.findOne.mockResolvedValue(mockBallotWithRelations);
      arbRepo.save.mockImplementation(async (e: any) => e as AcceptanceRepairBallot);

      const result = await service.sign('1', { id: 'user2', position: { code: 'operator' } });
      expect(result.operatorUser).toBeDefined();
      expect(arbRepo.save).toHaveBeenCalled();
      expect(workItemService.completeByRef).toHaveBeenCalledWith('user2', 'ARB', '1', 'sign');
    });

  });
});
