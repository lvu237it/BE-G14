import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, RoleSystem } from 'src/entities';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';

const mockUser = {
  id: '1',
  phone: '0984235573',
  password: 'hashed_pw',
  status: 'active',
  role_system_id: 'roleid',
  position_id: 'posid',
  isNeedChangePassword: false,
};

const mockRoleSystem = { id: 'roleid', name: 'admin' };

const mockDataSource = {
  manager: {
    transaction: jest.fn().mockImplementation(async (cb) =>
      cb({
        save: jest.fn(),
      }),
    ),
  },
};

describe('AuthService - login', () => {
  let service: AuthService;
  let userRepo: any;
  let roleRepo: any;
  let jwtService: any;
  let redis: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    roleRepo = { findOne: jest.fn() };
    jwtService = { signAsync: jest.fn() };
    redis = { set: jest.fn() };

    jest.spyOn(bcrypt, 'compare').mockImplementation(async (plain, hash) => {
      return plain === 'Admin@123' && hash === mockUser.password;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RoleSystem), useValue: roleRepo },
        { provide: 'REDIS', useValue: redis },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should login successfully with correct phone/password & active user', async () => {
    userRepo.findOne.mockResolvedValueOnce({ ...mockUser });
    roleRepo.findOne.mockResolvedValueOnce(mockRoleSystem);
    jwtService.signAsync.mockResolvedValueOnce('accessToken');
    jwtService.signAsync.mockResolvedValueOnce('refreshToken');
    redis.set.mockResolvedValueOnce(true);

    const result = await service.login('0984235573', 'Admin@123');
    expect(result).toMatchObject({
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      expiresIn: expect.anything(),
      needChangePassword: false,
      firstname: undefined,
      lastname: undefined,
      role_system_name: 'admin',
    });

    expect(userRepo.findOne).toHaveBeenCalled();
    expect(roleRepo.findOne).toHaveBeenCalled();
    expect(jwtService.signAsync).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it('should throw UnauthorizedException if user not found (wrong phone)', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.login('wrongphone', 'Admin@123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errCode: expect.anything(),
        message: expect.any(String),
      }),
      status: 401,
    });
  });

  it('should throw UnauthorizedException if user is inactive', async () => {
    userRepo.findOne.mockResolvedValueOnce({ ...mockUser, status: 'inactive' });
    await expect(
      service.login('0984235573', 'Admin@123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        errCode: expect.anything(),
        message: expect.any(String),
      }),
      status: 401,
    });
  });

  it('should throw UnauthorizedException if user is deleted (deletedAt)', async () => {
    userRepo.findOne.mockResolvedValueOnce(null); // vì where: ...deletedAt: null
    await expect(
      service.login('0984235573', 'Admin@123'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errCode: expect.anything() }),
      status: 401,
    });
  });

  it('should throw UnauthorizedException if password is wrong', async () => {
    userRepo.findOne.mockResolvedValueOnce({ ...mockUser });
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => false);
    await expect(
      service.login('0984235573', 'wrongpass'),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ errCode: expect.anything() }),
      status: 401,
    });
  });

  it('should throw for empty phone', async () => {
    await expect(service.login('', 'Admin@123')).rejects.toBeDefined();
  });

  it('should throw for null phone', async () => {
    // @ts-ignore
    await expect(service.login(null, 'Admin@123')).rejects.toBeDefined();
  });

  it('should throw for empty password', async () => {
    await expect(service.login('0984235573', '')).rejects.toBeDefined();
  });

  it('should throw for null password', async () => {
    // @ts-ignore
    await expect(service.login('0984235573', null)).rejects.toBeDefined();
  });
});

describe('AuthService - changePassword', () => {
  let service: AuthService;
  let userRepo: any;
  let roleRepo: any;
  let jwtService: any;
  let redis: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    roleRepo = { findOne: jest.fn() };
    jwtService = { signAsync: jest.fn() };
    redis = { set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RoleSystem), useValue: roleRepo },
        { provide: 'REDIS', useValue: redis },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // UTCID 01: Normal case - Valid user, correct current password, valid new password
  it('should change password successfully with valid user and correct current password', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      password: '$2a$10$hashedPassword123', // bcrypt hash
      isNeedChangePassword: true,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    userRepo.save.mockResolvedValueOnce({
      ...mockUser,
      isNeedChangePassword: false,
    });

    // Mock bcrypt.compare to return true for correct password
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => true);
    jest
      .spyOn(bcrypt, 'hash')
      .mockImplementationOnce(async () => '$2a$10$newHashedPassword');

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      '12345678A',
      'sonnguyen12',
    );

    expect(result).toMatchObject({
      result: 'SUCCESS',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: '028ae075-ba51-4407-813f-d978c1e3894d' },
    });
    expect(userRepo.save).toHaveBeenCalled();
  });

  // UTCID 02: Normal case - Valid user, correct current password, valid new password (different user)
  it('should change password successfully with different valid user', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      password: '$2a$10$hashedPassword123',
      isNeedChangePassword: false,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    userRepo.save.mockResolvedValueOnce({
      ...mockUser,
      isNeedChangePassword: false,
    });

    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => true);
    jest
      .spyOn(bcrypt, 'hash')
      .mockImplementationOnce(async () => '$2a$10$newHashedPassword');

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      '12345678A',
      'sonnguyen12',
    );

    expect(result).toMatchObject({
      result: 'SUCCESS',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
  });

  // UTCID 03: Abnormal case - User not found
  it('should handle user not found', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e323a',
      '12345678A',
      'sonnguyen12',
    );

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // UTCID 04: Normal case - Valid user, correct current password, valid new password (empty new password)
  it('should handle empty new password', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      password: '$2a$10$hashedPassword123',
      isNeedChangePassword: true,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => true);

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      '12345678',
      '',
    );

    // Should still process but with empty password
    expect(userRepo.findOne).toHaveBeenCalled();
  });

  // UTCID 05: Abnormal case - Valid user, correct current password, but new password same as current
  it('should return error when new password is same as current password', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      password: '$2a$10$hashedPassword123',
      isNeedChangePassword: true,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);

    // Mock bcrypt.compare: first call (current password check) returns true, second call (same password check) returns true
    jest
      .spyOn(bcrypt, 'compare')
      .mockImplementationOnce(async () => true) // current password is correct
      .mockImplementationOnce(async () => true); // new password is same as current

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      '12345678A', // Correct current password
      '12345678A', // Same as current password
    );

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
      errCode: expect.any(String),
    });
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // UTCID 06: Abnormal case - Valid user, wrong current password
  it('should return error when current password is wrong', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      password: '$2a$10$hashedPassword123',
      isNeedChangePassword: true,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => false);

    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      'Admin@1', // Wrong password
      'sonnguyen12',
    );

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: 'Mật khẩu hiện tại không đúng',
      errCode: expect.any(String),
    });
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  // UTCID 04: Boundary case - Valid user, correct current password, new password less than 8 characters
  it('should handle new password with less than 8 characters', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e323a',
      password: '$2a$10$hashedPassword123',
      isNeedChangePassword: true,
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    jest.spyOn(bcrypt, 'compare').mockImplementationOnce(async () => true);

    // Note: This test assumes the DTO validation happens before reaching the service
    // The service itself doesn't validate password length - that's handled by ChangePasswordDto
    // In a real scenario, this would be caught by ValidationPipe before reaching the service
    const result = await service.changePassword(
      '028ae075-ba51-4407-813f-d978c1e323a',
      '12345678A', // Correct current password
      '1234567', // Less than 8 characters
    );

    // The service will process it (since DTO validation would have caught this earlier)
    // But in unit test, we're testing the service logic directly
    expect(result).toMatchObject({
      result: 'SUCCESS',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(userRepo.save).toHaveBeenCalled();
  });
});

describe('AuthService - refresh', () => {
  let service: AuthService;
  let userRepo: any;
  let roleRepo: any;
  let jwtService: any;
  let redis: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    roleRepo = { findOne: jest.fn() };
    jwtService = { signAsync: jest.fn() };
    redis = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RoleSystem), useValue: roleRepo },
        { provide: 'REDIS', useValue: redis },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should refresh token successfully with valid refresh token', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      phone: '0984235573',
      firstname: 'Son',
      lastname: 'Nguyen',
      role_system_id: 'role-id',
      status: 'active',
    };

    const mockRole = { name: 'admin' };
    const mockRefreshToken = 'valid-refresh-token';

    redis.get.mockResolvedValueOnce(mockRefreshToken);
    userRepo.findOne.mockResolvedValueOnce(mockUser);
    roleRepo.findOne.mockResolvedValueOnce(mockRole);
    jwtService.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    redis.set.mockResolvedValueOnce('OK');

    const result = await service.refresh(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      mockRefreshToken,
    );

    expect(result).toMatchObject({
      result: 'SUCCESS',
      data: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: expect.any(String),
      },
    });
    expect(redis.get).toHaveBeenCalledWith(
      'refresh:028ae075-ba51-4407-813f-d978c1e3894d',
    );
    expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalled();
  });

  it('should return error when refresh token is invalid', async () => {
    redis.get.mockResolvedValueOnce(null);

    const result = await service.refresh(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      'invalid-token',
    );

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });

  it('should return error when user not found', async () => {
    const mockRefreshToken = 'valid-refresh-token';
    redis.get.mockResolvedValueOnce(mockRefreshToken);
    userRepo.findOne.mockResolvedValueOnce(null);

    const result = await service.refresh(
      '028ae075-ba51-4407-813f-d978c1e3894d',
      mockRefreshToken,
    );

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
  });
});

describe('AuthService - logout', () => {
  let service: AuthService;
  let redis: any;

  beforeEach(async () => {
    redis = { del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(RoleSystem), useValue: {} },
        { provide: 'REDIS', useValue: redis },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // UTCID 01: Normal case - Valid user logout successfully
  it('should logout successfully with valid user', async () => {
    redis.del.mockResolvedValueOnce(1);

    const result = await service.logout('028ae075-ba51-4407-813f-d978c1e3894d');

    expect(result).toMatchObject({
      result: 'SUCCESS',
      data: { success: true },
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(redis.del).toHaveBeenCalledWith(
      'refresh:028ae075-ba51-4407-813f-d978c1e3894d',
    );
  });

  // UTCID 02: Normal case - Valid user logout successfully (different user)
  it('should logout successfully with different valid user', async () => {
    redis.del.mockResolvedValueOnce(1);

    const result = await service.logout('028ae075-ba51-4407-813f-d978c1e323a');

    expect(result).toMatchObject({
      result: 'SUCCESS',
      data: { success: true },
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(redis.del).toHaveBeenCalledWith(
      'refresh:028ae075-ba51-4407-813f-d978c1e323a',
    );
  });

  // UTCID 03: Normal case - Logout user with no existing refresh token
  it('should logout successfully even when no refresh token exists', async () => {
    redis.del.mockResolvedValueOnce(0); // No token found to delete

    const result = await service.logout('028ae075-ba51-4407-813f-d978c1e3894d');

    expect(result).toMatchObject({
      result: 'SUCCESS',
      data: { success: true },
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(redis.del).toHaveBeenCalledWith(
      'refresh:028ae075-ba51-4407-813f-d978c1e3894d',
    );
  });

  // UTCID 04: Abnormal case - Redis connection error
  it('should handle Redis connection error gracefully', async () => {
    redis.del.mockRejectedValueOnce(new Error('Redis connection failed'));

    const result = await service.logout('028ae075-ba51-4407-813f-d978c1e3894d');

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(redis.del).toHaveBeenCalledWith(
      'refresh:028ae075-ba51-4407-813f-d978c1e3894d',
    );
  });

  // UTCID 05: Abnormal case - Redis timeout error
  it('should handle Redis timeout error gracefully', async () => {
    redis.del.mockRejectedValueOnce(new Error('Redis timeout'));

    const result = await service.logout('028ae075-ba51-4407-813f-d978c1e3894d');

    expect(result).toMatchObject({
      result: 'ERROR',
      reason: expect.any(String),
      errCode: expect.any(String),
    });
  });

  // UTCID 06: Boundary case - Empty user ID
  it('should handle empty user ID gracefully', async () => {
    redis.del.mockResolvedValueOnce(0);

    const result = await service.logout('');

    expect(result).toMatchObject({
      result: 'SUCCESS',
      data: { success: true },
      reason: expect.any(String),
      errCode: expect.any(String),
    });
    expect(redis.del).toHaveBeenCalledWith('refresh:');
  });
});

describe('AuthService - getProfile', () => {
  let service: AuthService;
  let userRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: {} },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(RoleSystem), useValue: {} },
        { provide: 'REDIS', useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // UTCID 01: Normal case - Valid admin user
  it('should get profile successfully for admin user', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      code: 'ADMIN001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      roleSystem: { id: 'role-id', name: 'admin' },
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);

    const result = await service.getProfile(
      '028ae075-ba51-4407-813f-d978c1e3894d',
    );

    expect(result).toMatchObject({
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      code: 'ADMIN001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      role_system: {
        id: 'role-id',
        name: 'admin',
      },
      status: 'active',
      department: null,
      position: null,
    });
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: '028ae075-ba51-4407-813f-d978c1e3894d', deletedAt: null },
      relations: ['roleSystem'],
    });
  });

  // UTCID 02: Normal case - Valid regular user with department and position
  it('should get profile successfully for regular user with department and position', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e323a',
      code: 'USER001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      department_id: 'dept-id',
      position_id: 'pos-id',
      roleSystem: { id: 'role-id', name: 'user' },
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockDepartment = {
      id: 'dept-id',
      name: 'IT Department',
      code: 'IT',
      description: 'Information Technology',
    };

    const mockPosition = {
      id: 'pos-id',
      name: 'Developer',
      description: 'Software Developer',
    };

    const mockDepRepo = { findOne: jest.fn() };
    const mockPosRepo = { findOne: jest.fn() };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    dataSource.getRepository
      .mockReturnValueOnce(mockDepRepo)
      .mockReturnValueOnce(mockPosRepo);
    mockDepRepo.findOne.mockResolvedValueOnce(mockDepartment);
    mockPosRepo.findOne.mockResolvedValueOnce(mockPosition);

    const result = await service.getProfile(
      '028ae075-ba51-4407-813f-d978c1e323a',
    );

    expect(result).toMatchObject({
      id: '028ae075-ba51-4407-813f-d978c1e323a',
      code: 'USER001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      department: {
        id: 'dept-id',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
      },
      position: {
        id: 'pos-id',
        name: 'Developer',
        description: 'Software Developer',
      },
      role_system: {
        id: 'role-id',
        name: 'user',
      },
      status: 'active',
    });
  });

  // UTCID 03: Normal case - Valid user with only department (no position)
  it('should get profile successfully for user with only department', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e323a',
      code: 'USER002',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      department_id: 'dept-id',
      position_id: null,
      roleSystem: { id: 'role-id', name: 'user' },
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockDepartment = {
      id: 'dept-id',
      name: 'IT Department',
      code: 'IT',
      description: 'Information Technology',
    };

    const mockDepRepo = { findOne: jest.fn() };

    userRepo.findOne.mockResolvedValueOnce(mockUser);
    dataSource.getRepository.mockReturnValueOnce(mockDepRepo);
    mockDepRepo.findOne.mockResolvedValueOnce(mockDepartment);

    const result = await service.getProfile(
      '028ae075-ba51-4407-813f-d978c1e323a',
    );

    expect(result).toMatchObject({
      id: '028ae075-ba51-4407-813f-d978c1e323a',
      code: 'USER002',
      department: {
        id: 'dept-id',
        name: 'IT Department',
        code: 'IT',
        description: 'Information Technology',
      },
      position: null,
    });
  });

  // UTCID 04: Abnormal case - User not found
  it('should throw UnauthorizedException when user not found', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.getProfile('invalid-id')).rejects.toThrow(
      'User not found',
    );
  });

  // UTCID 05: Abnormal case - User with deleted status
  it('should throw UnauthorizedException when user is deleted', async () => {
    userRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.getProfile('deleted-user-id')).rejects.toThrow(
      'User not found',
    );
  });

  // UTCID 06: Boundary case - User with minimal data
  it('should get profile successfully for user with minimal data', async () => {
    const mockUser = {
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      code: 'MIN001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      department_id: null,
      position_id: null,
      roleSystem: null,
      status: 'active',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    userRepo.findOne.mockResolvedValueOnce(mockUser);

    const result = await service.getProfile(
      '028ae075-ba51-4407-813f-d978c1e3894d',
    );

    expect(result).toMatchObject({
      id: '028ae075-ba51-4407-813f-d978c1e3894d',
      code: 'MIN001',
      lastname: 'Nguyen',
      firstname: 'Son',
      phone: '0984235573',
      card_number: '123456',
      department: null,
      position: null,
      role_system: null,
      status: 'active',
    });
  });
});
