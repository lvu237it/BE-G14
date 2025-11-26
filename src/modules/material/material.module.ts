import { Module } from '@nestjs/common';
import { MaterialService } from './material.service';
import { MaterialController } from './material.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from 'src/entities/material.entity';
import { MaterialType } from 'src/entities/material-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Material,MaterialType])],
  controllers: [MaterialController],
  providers: [MaterialService],
})
export class MaterialModule {}
