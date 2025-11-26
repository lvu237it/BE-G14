import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TechnicalAppraisalBallotService } from './technical-appraisal-ballot.service';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { Department } from 'src/entities/department.entity';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { WorkItemService } from '../work-item/work-item.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('TechnicalAppraisalBallotService', () => {
  let service: TechnicalAppraisalBallotService;
  let ballotRepo: any;
  let userRepo: any;
  let departmentRepo: any;
  let msbRepo: any;
  let workItemService: any;

  beforeEach(async () => {
    ballotRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    departmentRepo = {
      find: jest.fn(),
    };
    msbRepo = {
      findOne: jest.fn(),
    };
    workItemService = {
      completeByRef: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechnicalAppraisalBallotService,
        { provide: getRepositoryToken(TechnicalAppraisalBallot), useValue: ballotRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Department), useValue: departmentRepo },
        { provide: getRepositoryToken(MaterialSupplyBallot), useValue: msbRepo },
        { provide: WorkItemService, useValue: workItemService },
      ],
    }).compile();
    service = module.get<TechnicalAppraisalBallotService>(TechnicalAppraisalBallotService);
  });

  describe('findOne', () => {
    it('should throw NotFoundException if not found', async () => {
      ballotRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('nonexist')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should return ballot mapped dto', async () => {
      const fakeBallot = { id: 'b1', name: 'Test', equipment: { id: 'eq1', unit: 'u', code: 'e1', name: 'En' }, operator: { id: 'u1', code: 'c1', firstname: 'F', lastname: 'L', position: { code: 'P', name: 'PN' }, department_id: 'd1' }, status: 'pending', createdAt: new Date(), updatedAt: new Date() };
      ballotRepo.findOne.mockResolvedValue(fakeBallot);
      departmentRepo.find.mockResolvedValue([{ id: 'd1', code: 'D', name: 'DN' }]);
      const dto = await service.findOne('b1');
      expect(dto).toMatchObject({ id: 'b1', name: 'Test', status: 'pending', equipment: expect.any(Object), operator: expect.any(Object) });
    });
  });

  describe('sign', () => {
    it('should throw NotFoundException if ballot not found', async () => {
      ballotRepo.findOne.mockResolvedValue(null);
      await expect(service.sign('notfound', { id: 'usr', position: { code: 'operator' } })).rejects.toBeInstanceOf(NotFoundException);
    });
    it('should reject if field already signed', async () => {
      const fake = { id: 'b1', operator_id: 'exists' };
      ballotRepo.findOne.mockResolvedValueOnce(fake).mockResolvedValueOnce({});
      msbRepo.findOne.mockResolvedValue(null);
      const user = { id: 'u', position: { code: 'operator' } };
      await expect(service.sign('b1', user)).rejects.toBeInstanceOf(BadRequestException);
    });
    it('should succeed and call save and complete workitem', async () => {
      const fake = { id: 'b1', operator_id: undefined };
      ballotRepo.findOne.mockResolvedValueOnce(fake).mockResolvedValueOnce({});
      msbRepo.findOne.mockResolvedValue(null);
      const user = { id: 'u', position: { code: 'operator' } };
      ballotRepo.save.mockResolvedValue({ ...fake, operator_id: 'u' });
      const result = await service.sign('b1', user);
      expect(ballotRepo.save).toHaveBeenCalled();
      expect(workItemService.completeByRef).toHaveBeenCalledWith('u', 'TAB', 'b1', 'sign');
      expect(result.id).toBe('b1');
    });
  });
});
