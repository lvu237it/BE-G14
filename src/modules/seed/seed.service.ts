import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_SYSTEMS } from 'src/common/constants/roles_system';
import { RoleSystem, User, Permission } from 'src/entities';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  private readonly DEFAULT_PERMISSIONS = [
    { code: 'EQUIP', description: 'Quản lí thiết bị' },
    { code: 'EQUIP.VIEW', description: 'Xem danh sách thiết bị' },
    { code: 'EQUIP.CREATE', description: 'Tạo mới thiết bị' },
    { code: 'EQUIP.UPDATE', description: 'Cập nhật thiết bị' },
    { code: 'EQUIP.DELETE', description: 'Xóa thiết bị' },
    { code: 'MAT', description: 'Quản lí vật tư' },
    { code: 'MAT.VIEW', description: 'Xem danh sách vật tư' },
    { code: 'MAT.CREATE', description: 'Tạo mới vật tư' },
    { code: 'MAT.UPDATE', description: 'Cập nhật vật tư' },
    { code: 'MAT.DELETE', description: 'Xóa vật tư' },
    { code: 'MSB', description: 'Quản lí phiếu xin cấp vật tư' },
    { code: 'MSB.CREATE', description: 'Tạo phiếu xin cấp vật tư' },
    { code: 'MSB.UPDATE', description: 'Cập nhật phiếu xin cấp vật tư' },
    { code: 'MSB.VIEW', description: 'Xem phiếu xin cấp vật tư' },
    {
      code: 'MSB.ADJUST',
      description: 'Điều chỉnh cấp độ sửa chữa và số lượng vật tư duyệt',
    },
    {
      code: 'MSB.SIGNUPDATE',
      description: 'Ký và nhập số lượng vật tư thực cấp',
    },
    { code: 'MSB.REVIEW', description: 'Xem lại phiếu xin cấp vật tư' },
    { code: 'MSB.REJECT', description: 'Từ chối phiếu xin cấp vật tư' },
    { code: 'MSB.APPROVE', description: 'Duyệt phiếu xin cấp vật tư' },
    { code: 'MSB.SIGN', description: 'Ký phiếu xin cấp vật tư' },
    { code: 'ASB', description: 'Quản lí phiếu giao việc' },
    { code: 'ASB.VIEW', description: 'Xem phiếu giao việc' },
    { code: 'ASB.AUTHORIZE', description: 'Xác nhận giao việc' },
    { code: 'ASB.SIGN', description: 'Kí phiếu giao việc' },
    { code: 'ASB.AUTHORITY', description: 'Ủy quyền phiếu giao việc' },
    {
      code: 'ASB.AUTHORITY_FOR_OPERATOR',
      description: 'Ủy quyền phiếu giao việc cho tổ trưởng/người vận hành',
    },
    {
      code: 'ASB.AUTHORITY_FOR_DEPUTY_FOREMAN',
      description: 'Ủy quyền phiếu giao việc cho phó quản đốc',
    },
    { code: 'ASB.CONFIRM', description: 'Xác nhận & từ chối phiếu giao việc' },
    { code: 'ASB.UPDATE', description: 'Cập nhật kết quả phiếu giao việc' },
    { code: 'TAB', description: 'Quản lí biên bản giám định kĩ thuật' },
    { code: 'TAB.VIEW', description: 'Xem biên bản giám định kĩ thuật' },
    { code: 'TAB.UPDATE', description: 'Cập nhật biên bản giám định kĩ thuật' },
    { code: 'TAB.SIGN', description: 'Kí biên bản giám định kĩ thuật' },
    {
      code: 'QAB',
      description: 'Biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.VIEW',
      description:
        'Xem danh sách biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.CREATE',
      description:
        'Tạo mới biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.UPDATE',
      description:
        'Cập nhật biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.APPROVE',
      description:
        'Xác nhận tạo biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.FINAL',
      description:
        'Duyệt biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.REJECT',
      description:
        'Từ chối biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    {
      code: 'QAB.SIGN',
      description:
        'Ký biên bản đánh giá chất lượng vật tư thu hồi sau sửa chữa',
    },
    { code: 'ARB.VIEW', description: 'Xem biên bản nghiệm thu sửa chữa' },
    { code: 'ARB.SIGN', description: 'Ký biên bản nghiệm thu sửa chữa' },
    { code: 'SRB', description: 'Biên bản quyết toán sửa chữa' },
    { code: 'SRB.VIEW', description: 'Xem biên bản quyết toán sửa chữa' },
    { code: 'SRB.CREATE', description: 'Tạo biên bản quyết toán sửa chữa' },
    { code: 'SRB.SIGN', description: 'Kí biên bản quyết toán sửa chữa' },
    {
      code: 'DAB',
      description: 'Quản lí biên bản giám định kĩ thuật chi tiết',
    },
    {
      code: 'DAB.VIEW',
      description: 'Xem biên bản giám định kĩ thuật chi tiết',
    },
    {
      code: 'DAB.UPDATE',
      description: 'Cập nhật biên bản giám định kĩ thuật chi tiết',
    },
    {
      code: 'DAB.SIGN',
      description: 'Kí biên bản giám định kĩ thuật chi tiết',
    },
    {
      code: 'ARB',
      description: 'Quản lí biên bản nghiệm thu chạy thử sau sửa chữa',
    },
    { code: 'ARB.VIEW', description: 'Xem biên bản nghiệm thu chạy thử' },
    { code: 'ARB.SIGN', description: 'Kí biên bản' },
    { code: 'SRB', description: 'Quản lí biên bản quyết toán sau sửa chữa' },
    { code: 'SRB.CREATE', description: 'Tạo biên bản quyết toán sau sửa chữa' },
    { code: 'SRB.VIEW', description: 'Xem biên bản quyết toán sau sửa chữa' },
    { code: 'SRB.SIGN', description: 'Kí biên bản quyết toán sau sửa chữa' },
    { code: 'HR', description: 'Quản lí lịch sử sửa chữa' },
    { code: 'HR.VIEW', description: 'Xem lịch sử sửa chữa' },
    { code: 'WORK', description: 'Quản lí công việc' },
    { code: 'WORK.VIEW', description: 'Xem danh sách công việc' },
    { code: 'WORK.CREATE', description: 'Tạo công việc' },
    { code: 'WORK.UPDATE', description: 'Cập nhật công việc' },
  ];

  constructor(
    @InjectRepository(RoleSystem)
    private readonly roleSystemRepository: Repository<RoleSystem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async onModuleInit() {
    await this.seedRoles();
    await this.seedPermissions();
    await this.seedAdminUser();
  }

  private async seedRoles() {
    for (const roleName of DEFAULT_ROLE_SYSTEMS) {
      const exists = await this.roleSystemRepository.findOne({
        where: { name: roleName },
      });
      if (!exists) {
        const role = this.roleSystemRepository.create({ name: roleName });
        await this.roleSystemRepository.save(role);
        this.logger.log(`Seeded role: ${roleName}`);
      }
    }
  }

  private async seedPermissions() {
    for (const permissionData of this.DEFAULT_PERMISSIONS) {
      const exists = await this.permissionRepository.findOne({
        where: { code: permissionData.code },
      });
      if (!exists) {
        const permission = this.permissionRepository.create({
          code: permissionData.code,
          description: permissionData.description,
        });
        await this.permissionRepository.save(permission);
        this.logger.log(`Seeded permission: ${permissionData.code}`);
      }
    }
  }

  private async seedAdminUser() {
    const phone = process.env.ADMIN_PHONE || '0984235573';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminRole = await this.roleSystemRepository.findOne({
      where: { name: 'ADMIN' },
    });
    if (!adminRole) return;

    const existing = await this.userRepository.findOne({
      where: { phone },
      withDeleted: true,
    });
    if (existing) {
      const updates: Partial<User> = {};
      if ((existing as any).deletedAt) {
        await this.userRepository.restore((existing as any).id);
      }
      if ((existing as any).role_system_id !== (adminRole as any).id) {
        updates.role_system_id = (adminRole as any).id;
      }
      if ((existing as any).status !== 'active') {
        updates.status = 'active';
      }
      if (Object.keys(updates).length) {
        await this.userRepository.update((existing as any).id, updates);
      }
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      phone,
      password: hashed,
      role_system_id: (adminRole as any).id,
      status: 'active',
    });
    await this.userRepository.save(user);
    this.logger.log(`Seeded ADMIN user phone: ${phone}`);
  }
}
