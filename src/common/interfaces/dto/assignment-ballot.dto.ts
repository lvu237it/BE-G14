import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export interface AssignmentBallotListItemDto {
  id: string;
  name: string;
  description: string;
  department_repair_id: {
    id: string;
    name: string;
    code: string;
  } | null;

  department_manager?: {
    id: string;
    name: string;
    code: string;
  } | null;

  assign_by?: {
    id: string;
    fullname: string;
    code: string;
  } | null;

  equipment?: {
    id: string;
    name: string;
    code: string;
  } | null;

  status: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  assignedUserIds?: string[];
}

export class AssignmentBallotApprovalListItemDto {
  id: string;
  assignment_ballot_id: {
    id: string;
    name: string;
    equipment?: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
  position_name: string;
  approver?: {
    id: string;
    name: string;
  } | null;
  approverLead?: {
    id: string;
    name: string;
  } | null;
  approverFinal?: {
    id: string;
    name: string;
  } | null;
  delegatedUser?: {
    id: string;
    name: string;
  } | null;
  delegatedLeadUser?: {
    id: string;
    name: string;
  } | null;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export class AssignmentBallotCreateDto {
  @ApiProperty({ description: 'Tên phiếu', example: 'GVSC001' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Mô tả', example: '' })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Tên thiết bị',
    example: 'd3dd81f4-8464-4ff5-b4e5-5252dc4b6596',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tên thiết bị không được để trống' })
  equipment_id: string | null;

  @ApiPropertyOptional({
    description: 'Người giao việc',
    example: '2a0f0f9e-8cde-4b1a-8f55-7e4c1b2e3a10',
  })
  @IsOptional()
  @IsUUID()
  assign_by: string | null;

  @ApiPropertyOptional({
    description: 'Bộ phận',
    example: 'ceda7000-d6ce-4dae-94f0-b6680055727f',
  })
  @IsOptional()
  @IsUUID()
  department_repair_id: string | null;

  @ApiProperty({
    description: 'Trạng thái',
    enum: ['pending', 'in_progress', 'done', 'rejected'],
    example: 'pending',
  })
  @IsEnum(['pending', 'in_progress', 'done', 'rejected'])
  status: 'pending' | 'in_progress' | 'done' | 'rejected';
}

export class DelegateAssignmentBallotDto {
  @ApiProperty({ description: 'ID user được ủy quyền' })
  @IsUUID()
  delegatedUserId: string;

  @ApiPropertyOptional({ description: 'Ghi chú' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DelegateAssignmentBallotOtherDto {
  @ApiProperty({ description: 'ID user được ủy quyền' })
  @IsUUID()
  delegatedUserId: string;
}
