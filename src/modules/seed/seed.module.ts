import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleSystem } from 'src/entities/role-system.entity';
import { User } from 'src/entities/user.entity';
import { Permission } from 'src/entities/permission.entity';
import { SeedService } from './seed.service';
@Module({
  imports: [TypeOrmModule.forFeature([RoleSystem, User, Permission])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
