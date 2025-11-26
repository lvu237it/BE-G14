import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MaterialSupplyBallotService } from './material-supply-ballot.service';
import { MaterialSupplyBallot } from 'src/entities/material-supply-ballot.entity';
import { TechnicalAppraisalBallot } from 'src/entities/technical-appraisal-ballot.entity';
import { DetailAppraisalBallot } from 'src/entities/detail-appraisal-ballot.entity';
import { User } from 'src/entities/user.entity';
import { Position } from 'src/entities/position.entity';
import { AssignmentBallot } from 'src/entities/assignment-ballot.entity';
import { AssignmentBallotApproval } from 'src/entities/assignment-ballot-approval.entity';
import { Equipment } from 'src/entities/equipment.entity';
import { Department } from 'src/entities/department.entity';
import { RepairRequest } from 'src/entities/repair-request.entity';
import { WorkItemService } from '../work-item/work-item.service';
import { CreateMaterialSupplyBallotWithDetailsDto } from 'src/common/interfaces/dto/material-supply-ballot.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MaterialSupplyBallotDetail } from 'src/entities/material-supply-ballot-detail.entity';
import { DetailAppraisalBallotItem } from 'src/entities/detail-appraisal-ballot-item.entity';
import { AcceptanceRepairBallot } from 'src/entities/acceptance-repair-ballot.entity';
import { WorkItem } from 'src/entities/work-item.entity';

describe('MaterialSupplyBallotService - create', () => {
  let service: MaterialSupplyBallotService;
  let msbRepo: any;
  let positionRepo: any;
  let userRepo: any;
  let workItemService: any;
  let assignmentBallotRepo: any;
  let acceptanceRepairBallotRepo: any;
  let msbDetailRepo: any;
  let dabItemRepo: any;
  let workItemRepo: any;

  const creatorUserId = 'creator-user-id-123';
  const transportMechanicId = 'transport-mechanic-id-456';
  const leadWarehouseId = 'lead-warehouse-id-789';

  beforeEach(async () => {
    // Mock repositories
    msbRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    positionRepo = {
      find: jest.fn(),
    };

    userRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    workItemService = {
      create: jest.fn(),
      completeByRef: jest.fn(),
      deleteWorkItemForRef: jest.fn(),
    };

    assignmentBallotRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    acceptanceRepairBallotRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    msbDetailRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    dabItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    workItemRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialSupplyBallotService,
        {
          provide: getRepositoryToken(MaterialSupplyBallot),
          useValue: msbRepo,
        },
        {
          provide: getRepositoryToken(TechnicalAppraisalBallot),
          useValue: {},
        },
        {
          provide: getRepositoryToken(DetailAppraisalBallot),
          useValue: {},
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(Position),
          useValue: positionRepo,
        },
        {
          provide: getRepositoryToken(AssignmentBallot),
          useValue: assignmentBallotRepo,
        },
        {
          provide: getRepositoryToken(AssignmentBallotApproval),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: {},
        },
        {
          provide: getRepositoryToken(Department),
          useValue: {},
        },
        {
          provide: getRepositoryToken(RepairRequest),
          useValue: {},
        },
        {
          provide: getRepositoryToken(AcceptanceRepairBallot),
          useValue: acceptanceRepairBallotRepo,
        },
        {
          provide: getRepositoryToken(MaterialSupplyBallotDetail),
          useValue: msbDetailRepo,
        },
        {
          provide: getRepositoryToken(DetailAppraisalBallotItem),
          useValue: dabItemRepo,
        },
        {
          provide: getRepositoryToken(WorkItem),
          useValue: workItemRepo,
        },
        {
          provide: WorkItemService,
          useValue: workItemService,
        },
      ],
    }).compile();

    service = module.get<MaterialSupplyBallotService>(
      MaterialSupplyBallotService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UTCID 01: Normal case - Create MSB and find users by position (typical scenario)', () => {
    it('should create MSB and find CĐVT and Thủ kho users by position aliases', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        equipment_id: 'equipment-id-123',
        status: 'pending',
        details: [
          {
            material_id: 'material-id-1',
            quantity_request: 10,
            reason: 'Thay mới',
          },
        ],
      } as any;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        equipment_id: dto.equipment_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cdvtPosition = { id: 'position-id-1', code: 'transport_mechanic' };
      const cdvtUsers = [
        { id: 'user-1', position_id: 'position-id-1', status: 'active' },
        { id: 'user-2', position_id: 'position-id-1', status: 'active' },
      ];

      const thuKhoPosition = { id: 'position-id-2', code: 'lead_warehouse' };
      const thuKhoUsers = [
        {
          id: 'thu-kho-user-1',
          position_id: 'position-id-2',
          status: 'active',
        },
      ];

      msbRepo.create.mockReturnValue({
        ...savedEntity,
        details: dto.details?.map((d) => ({
          ...d,
          createdBy: creatorUserId,
        })),
      });
      msbRepo.save.mockResolvedValue(savedEntity);

      // Mock position lookups - first for CĐVT, then for Thủ kho
      positionRepo.find
        .mockResolvedValueOnce([cdvtPosition]) // First call for CĐVT
        .mockResolvedValueOnce([thuKhoPosition]); // Second call for Thủ kho

      userRepo.find
        .mockResolvedValueOnce(cdvtUsers) // First call for CĐVT users
        .mockResolvedValueOnce(thuKhoUsers); // Second call for Thủ kho users

      const result = await service.create(dto, creatorUserId);

      // Verify MSB was created correctly
      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          status: 'pending',
          details: expect.arrayContaining([
            expect.objectContaining({
              material_id: 'material-id-1',
              quantity_request: 10,
              reason: 'Thay mới',
              createdBy: creatorUserId,
            }),
          ]),
        }),
      );
      expect(msbRepo.save).toHaveBeenCalled();

      // Verify position lookups were called
      expect(positionRepo.find).toHaveBeenCalledTimes(2);

      // Verify work items created for all CĐVT users
      const cdvtWorkItemCalls = (
        workItemService.create as jest.Mock
      ).mock.calls.filter((call) => call[0].task_type === 'approve_adjust');
      expect(cdvtWorkItemCalls).toHaveLength(cdvtUsers.length);
      cdvtUsers.forEach((user) => {
        expect(
          cdvtWorkItemCalls.some((call) => call[0].user_id === user.id),
        ).toBe(true);
      });

      // Verify work item created for Thủ kho (first user only)
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: thuKhoUsers[0].id,
          ref_type: 'MSB',
          ref_id: savedEntity.id,
          task_type: 'sign',
          task_name: 'Ký Phiếu xin cấp vật tư',
          ballot_name: dto.name,
          status: 'pending',
        }),
        creatorUserId,
      );

      // Verify result structure
      expect(result).toMatchObject({
        id: savedEntity.id,
        name: dto.name,
        status: 'pending',
      });
    });
  });

  describe('UTCID 02: Edge case - Create with transport_mechanic_id and lead_warehouse_id provided', () => {
    it('should create MSB and work items when both IDs are provided in DTO', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        equipment_id: 'equipment-id-123',
        status: 'pending',
        details: [
          {
            material_id: 'material-id-1',
            quantity_request: 10,
            reason: 'Thay mới',
          },
        ],
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        transport_mechanic_id: transportMechanicId,
        lead_warehouse_id: leadWarehouseId,
        equipment_id: dto.equipment_id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue({
        ...savedEntity,
        details: dto.details?.map((d) => ({
          ...d,
          createdBy: creatorUserId,
        })),
      });
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      // Verify MSB was created correctly
      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          status: 'pending',
        }),
      );
      expect(msbRepo.save).toHaveBeenCalled();

      // Verify work items were created for transport_mechanic (no position lookup)
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: transportMechanicId,
          ref_type: 'MSB',
          ref_id: savedEntity.id,
          task_type: 'approve_adjust',
          task_name: 'Duyệt và điều chỉnh Phiếu xin cấp vật tư',
          ballot_name: dto.name,
          status: 'pending',
        }),
        creatorUserId,
      );

      // Verify work items were created for lead_warehouse (no position lookup)
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: leadWarehouseId,
          ref_type: 'MSB',
          ref_id: savedEntity.id,
          task_type: 'sign',
          task_name: 'Ký Phiếu xin cấp vật tư',
          ballot_name: dto.name,
          status: 'pending',
        }),
        creatorUserId,
      );

      // Verify no position lookups were made
      expect(positionRepo.find).not.toHaveBeenCalled();

      // Verify result structure
      expect(result).toMatchObject({
        id: savedEntity.id,
        name: dto.name,
        status: 'pending',
      });
    });
  });

  describe('UTCID 03: Normal case - Create without transport_mechanic_id, find by position', () => {
    it('should create MSB and find CĐVT users by position aliases', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        lead_warehouse_id: leadWarehouseId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cdvtPosition = { id: 'position-id-1', code: 'transport_mechanic' };
      const cdvtUsers = [
        { id: 'user-1', position_id: 'position-id-1', status: 'active' },
        { id: 'user-2', position_id: 'position-id-1', status: 'active' },
      ];

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([cdvtPosition]);
      userRepo.find.mockResolvedValue(cdvtUsers);

      const result = await service.create(dto, creatorUserId);

      // Verify position lookup for CĐVT
      expect(positionRepo.find).toHaveBeenCalledWith({
        where: [
          { code: 'transport_mechanic' },
          { code: 'cdvt' },
          { code: 'phong_cdvt' },
          { code: 'CĐVT' },
        ],
      });

      // Verify user lookup for CĐVT
      expect(userRepo.find).toHaveBeenCalledWith({
        where: {
          position_id: expect.anything(),
          status: 'active',
        },
      });

      // Verify work items created for each CĐVT user
      expect(workItemService.create).toHaveBeenCalledTimes(
        cdvtUsers.length + 1, // CĐVT users + lead_warehouse
      );

      // Verify work item for lead_warehouse
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: leadWarehouseId,
          task_type: 'sign',
        }),
        creatorUserId,
      );
    });
  });

  describe('UTCID 04: Normal case - Create without lead_warehouse_id, find by position', () => {
    it('should create MSB and find Thủ kho user by position aliases', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        transport_mechanic_id: transportMechanicId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const thuKhoPosition = { id: 'position-id-2', code: 'lead_warehouse' };
      const thuKhoUsers = [
        {
          id: 'thu-kho-user-1',
          position_id: 'position-id-2',
          status: 'active',
        },
      ];

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([thuKhoPosition]);
      userRepo.find.mockResolvedValue(thuKhoUsers);

      const result = await service.create(dto, creatorUserId);

      // Verify position lookup for Thủ kho
      expect(positionRepo.find).toHaveBeenCalledWith({
        where: [
          { code: 'lead_warehouse' },
          { code: 'thu_kho' },
          { code: 'thukho' },
          { code: 'TK' },
        ],
      });

      // Verify only first Thủ kho user gets work item
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: thuKhoUsers[0].id,
          task_type: 'sign',
        }),
        creatorUserId,
      );

      // Verify work item for transport_mechanic
      expect(workItemService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: transportMechanicId,
          task_type: 'approve_adjust',
        }),
        creatorUserId,
      );
    });
  });

  describe('UTCID 05: Normal case - Create with no position found', () => {
    it('should create MSB without work items when positions not found', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([]);
      userRepo.find.mockResolvedValue([]);

      const result = await service.create(dto, creatorUserId);

      // Verify MSB was created
      expect(msbRepo.save).toHaveBeenCalled();

      // Verify no work items were created
      expect(workItemService.create).not.toHaveBeenCalled();

      expect(result).toMatchObject({
        id: savedEntity.id,
        name: dto.name,
        status: 'pending',
      });
    });
  });

  describe('UTCID 06: Normal case - Create with default status', () => {
    it('should create MSB with default status "pending" when status not provided', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      // Verify status defaults to 'pending'
      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        }),
      );

      expect(result.status).toBe('pending');
    });
  });

  describe('UTCID 07: Normal case - Create with custom status', () => {
    it('should create MSB with provided status', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'draft',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'draft',
        }),
      );

      expect(result.status).toBe('draft');
    });
  });

  describe('UTCID 08: Normal case - Create with empty details array', () => {
    it('should create MSB with empty details array', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        details: [],
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [],
        }),
      );

      expect(result).toBeDefined();
    });
  });

  describe('UTCID 09: Normal case - Create with multiple details', () => {
    it('should create MSB with multiple detail items', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        details: [
          {
            material_id: 'material-id-1',
            quantity_request: 10,
            reason: 'Thay mới',
            notes: 'Note 1',
          },
          {
            material_id: 'material-id-2',
            quantity_request: 5,
            reason: 'Sửa chữa',
            notes: 'Note 2',
          },
        ],
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.arrayContaining([
            expect.objectContaining({
              material_id: 'material-id-1',
              quantity_request: 10,
              reason: 'Thay mới',
              notes: 'Note 1',
              createdBy: creatorUserId,
            }),
            expect.objectContaining({
              material_id: 'material-id-2',
              quantity_request: 5,
              reason: 'Sửa chữa',
              notes: 'Note 2',
              createdBy: creatorUserId,
            }),
          ]),
        }),
      );

      expect(result).toBeDefined();
    });
  });

  describe('UTCID 10: Normal case - Create with null details', () => {
    it('should create MSB with empty array when details is null', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        details: null as any,
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [],
        }),
      );

      expect(result).toBeDefined();
    });
  });

  describe('UTCID 11: Normal case - Create with undefined details', () => {
    it('should create MSB with empty array when details is undefined', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);

      const result = await service.create(dto, creatorUserId);

      expect(msbRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [],
        }),
      );

      expect(result).toBeDefined();
    });
  });

  describe('UTCID 12: Edge case - Multiple Thủ kho users, only first gets work item', () => {
    it('should create work item only for first Thủ kho user when multiple found', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const thuKhoPosition = { id: 'position-id-2', code: 'lead_warehouse' };
      const thuKhoUsers = [
        {
          id: 'thu-kho-user-1',
          position_id: 'position-id-2',
          status: 'active',
        },
        {
          id: 'thu-kho-user-2',
          position_id: 'position-id-2',
          status: 'active',
        },
        {
          id: 'thu-kho-user-3',
          position_id: 'position-id-2',
          status: 'active',
        },
      ];

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([thuKhoPosition]);
      userRepo.find.mockResolvedValue(thuKhoUsers);

      const result = await service.create(dto, creatorUserId);

      // Verify only one work item created for Thủ kho (first user)
      const thuKhoWorkItemCalls = (
        workItemService.create as jest.Mock
      ).mock.calls.filter(
        (call) =>
          call[0].task_type === 'sign' &&
          call[0].user_id !== transportMechanicId,
      );

      expect(thuKhoWorkItemCalls).toHaveLength(1);
      expect(thuKhoWorkItemCalls[0][0].user_id).toBe(thuKhoUsers[0].id);
    });
  });

  describe('UTCID 13: Edge case - Multiple CĐVT users, all get work items', () => {
    it('should create work items for all CĐVT users when multiple found', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;
      (dto as any).lead_warehouse_id = leadWarehouseId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cdvtPosition = { id: 'position-id-1', code: 'transport_mechanic' };
      const cdvtUsers = [
        { id: 'cdvt-user-1', position_id: 'position-id-1', status: 'active' },
        { id: 'cdvt-user-2', position_id: 'position-id-1', status: 'active' },
        { id: 'cdvt-user-3', position_id: 'position-id-1', status: 'active' },
      ];

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([cdvtPosition]);
      userRepo.find.mockResolvedValue(cdvtUsers);

      const result = await service.create(dto, creatorUserId);

      // Verify work items created for all CĐVT users
      const cdvtWorkItemCalls = (
        workItemService.create as jest.Mock
      ).mock.calls.filter((call) => call[0].task_type === 'approve_adjust');

      expect(cdvtWorkItemCalls).toHaveLength(cdvtUsers.length);
      cdvtUsers.forEach((user) => {
        expect(
          cdvtWorkItemCalls.some((call) => call[0].user_id === user.id),
        ).toBe(true);
      });
    });
  });

  describe('UTCID 14: Edge case - Thủ kho users found but all inactive', () => {
    it('should not create work item when all Thủ kho users are inactive', async () => {
      const dto: CreateMaterialSupplyBallotWithDetailsDto = {
        name: 'Phiếu xin cấp vật tư test',
        status: 'pending',
      } as any;
      (dto as any).transport_mechanic_id = transportMechanicId;

      const savedEntity = {
        id: 'msb-id-123',
        name: dto.name,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const thuKhoPosition = { id: 'position-id-2', code: 'lead_warehouse' };
      const thuKhoUsers = [
        {
          id: 'thu-kho-user-1',
          position_id: 'position-id-2',
          status: 'inactive',
        },
      ];

      msbRepo.create.mockReturnValue(savedEntity);
      msbRepo.save.mockResolvedValue(savedEntity);
      positionRepo.find.mockResolvedValue([thuKhoPosition]);
      userRepo.find.mockResolvedValue([]); // No active users

      const result = await service.create(dto, creatorUserId);

      // Verify only transport_mechanic work item created
      const signWorkItemCalls = (
        workItemService.create as jest.Mock
      ).mock.calls.filter((call) => call[0].task_type === 'sign');

      expect(signWorkItemCalls).toHaveLength(0);
    });
  });
});

describe('MaterialSupplyBallotService - sign', () => {
  let service: MaterialSupplyBallotService;
  let msbRepo: any;
  let userRepo: any;
  let workItemService: any;
  let acceptanceRepairBallotRepo: any;
  let msbDetailRepo: any;
  let dabItemRepo: any;
  let workItemRepo: any;

  beforeEach(async () => {
    msbRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    userRepo = {
      findOne: jest.fn(),
    };
    workItemService = {
      completeByRef: jest.fn(),
      deleteWorkItemForRef: jest.fn(),
    };

    acceptanceRepairBallotRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    msbDetailRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    dabItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    workItemRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialSupplyBallotService,
        {
          provide: getRepositoryToken(MaterialSupplyBallot),
          useValue: msbRepo,
        },
        { provide: getRepositoryToken(TechnicalAppraisalBallot), useValue: {} },
        { provide: getRepositoryToken(DetailAppraisalBallot), useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Position), useValue: {} },
        { provide: getRepositoryToken(AssignmentBallot), useValue: {} },
        {
          provide: getRepositoryToken(AssignmentBallotApproval),
          useValue: {},
        },
        { provide: getRepositoryToken(Equipment), useValue: {} },
        { provide: getRepositoryToken(Department), useValue: {} },
        { provide: getRepositoryToken(RepairRequest), useValue: {} },
        {
          provide: getRepositoryToken(AcceptanceRepairBallot),
          useValue: acceptanceRepairBallotRepo,
        },
        {
          provide: getRepositoryToken(MaterialSupplyBallotDetail),
          useValue: msbDetailRepo,
        },
        {
          provide: getRepositoryToken(DetailAppraisalBallotItem),
          useValue: dabItemRepo,
        },
        {
          provide: getRepositoryToken(WorkItem),
          useValue: workItemRepo,
        },
        { provide: WorkItemService, useValue: workItemService },
      ],
    }).compile();

    service = module.get(MaterialSupplyBallotService);
  });

  it('UTCID S01: should sign as transport_mechanic and mark completed when last signer', async () => {
    const msb = {
      id: 'msb-1',
      name: 'MSB 1',
      status: 'in_progress',
      lead_warehouse_id: 'u-lead',
      receiver_id: 'u-receiver',
      deputy_foreman_id: 'u-deputy',
      transport_mechanic_id: null,
      details: [],
      equipment_id: null, // avoid ARB flow
      updatedBy: null,
    };
    msbRepo.findOne.mockResolvedValue(msb);
    msbRepo.save.mockImplementation(async (obj: any) => obj);

    const user = {
      id: 'u-mechanic',
      position: { code: 'transport_mechanic' },
    };

    const result = await service.sign('msb-1', user as any);

    expect(msbRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        transport_mechanic_id: 'u-mechanic',
        status: 'completed',
        updatedBy: 'u-mechanic',
      }),
    );
    expect(workItemService.completeByRef).toHaveBeenCalledWith(
      'u-mechanic',
      'MSB',
      'msb-1',
      'sign',
    );
    expect(result).toMatchObject({
      id: 'msb-1',
      status: 'completed',
    });
  });

  it('UTCID S02: should throw NotFoundException when MSB not found', async () => {
    msbRepo.findOne.mockResolvedValue(null);
    await expect(
      service.sign('not-found', {
        id: 'u1',
        position: { code: 'transport_mechanic' },
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('UTCID S03: should throw BadRequestException when user not allowed to sign', async () => {
    const msb = { id: 'msb-1', details: [], status: 'in_progress' };
    msbRepo.findOne.mockResolvedValue(msb);
    await expect(
      service.sign('msb-1', {
        id: 'u1',
        position: { code: 'unknown_role' },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('UTCID S04: should throw BadRequestException when target field already signed', async () => {
    const msb = {
      id: 'msb-1',
      details: [],
      status: 'in_progress',
      transport_mechanic_id: 'someone',
    };
    msbRepo.findOne.mockResolvedValue(msb);
    await expect(
      service.sign('msb-1', {
        id: 'u1',
        position: { code: 'transport_mechanic' },
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
