import { Module } from '@nestjs/common';
import { MaterialTypeService } from './material-type.service';
import { MaterialTypeController } from './material-type.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialType } from 'src/entities/material-type.entity';
import { Material } from 'src/entities/material.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialType,Material])],
  controllers: [MaterialTypeController],
  providers: [MaterialTypeService],
})
export class MaterialTypeModule {}
