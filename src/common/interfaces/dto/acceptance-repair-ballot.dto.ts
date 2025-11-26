import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AcceptanceRepairBallotListItemDto {
  id: string;
  name: string;
  equipment?: {
    id: string;
    name: string;
    code: string;
    department?: {
      id: string;
      name: string;
    } | null;
  } | null;
   operatorUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
     position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
   equipmentManager?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
     position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
   repairmanUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
     position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
   transportUser?: {
    id: string;
    name: string;
    department?: {
      id: string;
      name: string;
    } | null;
     position?: {
      id: string;
      name: string;
      code:string;
    } | null;
  } | null;
  signUsers?: {
    id: string;
    name: string;
    department?: { id: string; name: string };
    position?: { id: string; name: string; code: string };
  }[];
  status: 'draft' | 'pending' | 'done';
  fixDate: Date | null ;
  createdAt: Date | null;
  updatedAt: Date | null;
}
