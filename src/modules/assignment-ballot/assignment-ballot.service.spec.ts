import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentBallotService } from './assignment-ballot.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import * as signMapModule from 'src/common/constants/position_map';
import {
  AssignmentBallotApproval,
  DetailAppraisalBallot,
  MaterialSupplyBallot,
  Position,
  PositionPermission,
  TechnicalAppraisalBallot,
  User,
} from 'src/entities';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { WorkItemService } from '../work-item/work-item.service';

const mockQueryBuilder = () => ({
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[{ id: '1', name: 'Test Ballot' }], 1]),
});

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn().mockImplementation(() => mockQueryBuilder()),
});

const mockWorkItemService = () => ({
  process: jest.fn(),
  completeByRef: jest.fn(),
  create: jest.fn(),
  deleteWorkItemForRef: jest.fn(),
  findRef: jest.fn(),
});

describe('AssignmentBallotService', () => {
  let service: AssignmentBallotService;
  let moduleRef: TestingModule;
  let ballotRepo: jest.Mocked<Repository<AssignmentBallot>>;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      providers: [
        AssignmentBallotService,
        { provide: getRepositoryToken(AssignmentBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(AssignmentBallotApproval), useValue: mockRepo() },
        { provide: getRepositoryToken(MaterialSupplyBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(TechnicalAppraisalBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(DetailAppraisalBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(User), useValue: mockRepo() },
        { provide: getRepositoryToken(Position), useValue: mockRepo() },
        { provide: getRepositoryToken(AcceptanceRepairBallot), useValue: mockRepo() },
        { provide: getRepositoryToken(PositionPermission), useValue: mockRepo() },
        { provide: WorkItemService, useValue: mockWorkItemService() },
      ],
    }).compile();

    service = moduleRef.get<AssignmentBallotService>(AssignmentBallotService);
    ballotRepo = moduleRef.get(getRepositoryToken(AssignmentBallot));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ====================== findAll ======================
  describe('findAll', () => {
    it('should return all ballots with pagination', async () => {
      const result = await service.findAll();
      expect(result.items).toEqual([expect.objectContaining({ id: '1', name: 'Test Ballot' })]);
      expect(result.total).toBe(1);
      expect(ballotRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });
  });

  // ====================== findOne ======================
  describe('findOne', () => {
    it('should throw NotFoundException if ballot not found', async () => {
      ballotRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
    });

    it('should return ballot if found', async () => {
      const mockBallot = { id: '1', name: 'Test Ballot' } as AssignmentBallot;
      ballotRepo.findOne.mockResolvedValue(mockBallot);
      const result = await service.findOne('1');
      expect(result).toEqual(expect.objectContaining(mockBallot));
      expect(ballotRepo.findOne).toHaveBeenCalledWith({ where: { id: '1' }, relations: expect.any(Array) });
    });
  });

 // ====================== approve ======================
describe('approve', () => {
  it('should approve successfully', async () => {
    const approvalRepo = moduleRef.get(getRepositoryToken(AssignmentBallotApproval));
    const acceptanceRepo = moduleRef.get(getRepositoryToken(AcceptanceRepairBallot));
    const msbRepo = moduleRef.get(getRepositoryToken(MaterialSupplyBallot));
    const detailRepo = moduleRef.get(getRepositoryToken(DetailAppraisalBallot));
    const technicalRepo = moduleRef.get(getRepositoryToken(TechnicalAppraisalBallot));
    const workItemService = moduleRef.get(WorkItemService) as jest.Mocked<WorkItemService>;

    const mockApproval = { id: '1', assignment_ballot_id: 'abc123', status: 'Pending' } as any;
    const mockAssignmentBallot = { id: 'abc123', name: 'Test Assignment Ballot' } as any;
    const mockAcceptanceRepair = { id: 'new-acceptance-id' } as any;
    const mockDetail = { id: 'detail1' } as any;

    approvalRepo.findOne.mockResolvedValue(mockApproval);
    ballotRepo.findOne.mockResolvedValue(mockAssignmentBallot);
    msbRepo.findOne.mockResolvedValue({});
    detailRepo.findOne.mockResolvedValue(mockDetail);
    technicalRepo.findOne.mockResolvedValue({});
    approvalRepo.save.mockResolvedValue({ ...mockApproval, status: 'Approved' });
    acceptanceRepo.create.mockReturnValue(mockAcceptanceRepair);
    acceptanceRepo.save.mockResolvedValue(mockAcceptanceRepair);

    workItemService.completeByRef.mockResolvedValue(undefined);
    workItemService.create.mockResolvedValue(undefined);
    workItemService.findRef.mockResolvedValue(mockDetail);

    const result = await service.approve('1', 'user1');

    expect(result.status).toBe('Approved');
    expect(workItemService.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if approval not found', async () => {
  const approvalRepo = moduleRef.get(getRepositoryToken(AssignmentBallotApproval));
  approvalRepo.findOne.mockResolvedValue(null);

  await expect(service.approve('1', 'user1')).rejects.toThrow(NotFoundException);
});
});


// ====================== sign ======================
describe('sign', () => {
  let ballotRepo: any;
  let userRepo: any;
  let workItemService: jest.Mocked<WorkItemService>;

  beforeEach(() => {
    ballotRepo = moduleRef.get(getRepositoryToken(AssignmentBallot));
    userRepo = moduleRef.get(getRepositoryToken(User));
    workItemService = moduleRef.get(WorkItemService) as jest.Mocked<WorkItemService>;
  });

  it('should sign ballot successfully', async () => {
  // Mở rộng map để deputy_director => deputy_director_sign
  Object.assign(signMapModule.assignmentBallotSignMap, {
    deputy_director: 'deputy_director_sign',
  });

  const mockBallot = {
    id: '1',
    name: 'Test Ballot',
    status: 'pending',
    assign_by: null,
    deputy_director_sign: null, // phải tồn tại
  } as any;

  const mockUser = { id: 'user1', position: { code: 'deputy_director' } } as any;

  ballotRepo.findOne.mockResolvedValue(mockBallot);
  ballotRepo.save.mockImplementation(async (e) => e);
  userRepo.findOne.mockResolvedValue(mockUser);
  workItemService.create.mockResolvedValue(undefined);

  const result = await service.sign('1', mockUser);

  expect(ballotRepo.save).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'in_progress',
      assign_by: 'user1',
      deputy_director_sign: 'user1',
    }),
  );
  expect(result.status).toBe('in_progress');
});

  it('should throw NotFoundException if ballot not found', async () => {
    ballotRepo.findOne.mockResolvedValue(null);
    await expect(service.sign('1', { id: 'user1' })).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if user cannot sign', async () => {
    const mockBallot = {
      id: '1',
      name: 'Test Ballot',
      status: 'pending',
      assign_by: null,
      deputy_director_sign: null,
    } as any;

    const mockUser = { id: 'user2', position: { code: 'staff' } } as any;

    ballotRepo.findOne.mockResolvedValue(mockBallot);

    // Trả về field không khớp với property trên ballot
    (service as any).getFieldByPosition = jest.fn().mockReturnValue('non_existing_field');

    await expect(service.sign('1', mockUser)).rejects.toThrow(BadRequestException);
  });
});



});
