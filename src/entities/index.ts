export * from './role-system.entity';
export * from './user.entity';
export * from './equipment-type.entity';
export * from './location-equipment.entity';
export * from './equipment.entity';
export * from './department.entity';
export * from './position.entity';
export * from './permission.entity';
export * from './position-permission.entity';
export * from './material-supply-ballot.entity';
export * from './detail-appraisal-ballot.entity';
export * from './technical-appraisal-ballot.entity';
export * from './material-supply-ballot-detail.entity';
export * from './detail-appraisal-ballot-item.entity';
import { Department } from './department.entity';
import { RoleSystem } from './role-system.entity';
import { User } from './user.entity';
import { EquipmentType } from './equipment-type.entity';
import { LocationEquipment } from './location-equipment.entity';
import { Equipment } from './equipment.entity';
import { Position } from './position.entity';
import { Permission } from './permission.entity';
import { PositionPermission } from './position-permission.entity';
import { MaterialType } from './material-type.entity';
import { Material } from './material.entity';
import { MaterialSupplyBallot } from './material-supply-ballot.entity';
import { DetailAppraisalBallot } from './detail-appraisal-ballot.entity';
import { TechnicalAppraisalBallot } from './technical-appraisal-ballot.entity';
import { MaterialSupplyBallotDetail } from './material-supply-ballot-detail.entity';
import { DetailAppraisalBallotItem } from './detail-appraisal-ballot-item.entity';
import { HistoryEquipment } from './history-equipment.entity';
import { AssignmentBallot } from './assignment-ballot.entity';
import { WorkItem } from './work-item.entity';
import { AssignmentBallotApproval } from './assignment-ballot-approval.entity';
import { RepairRequest } from './repair-request.entity';
export * from './assignment-ballot-approval.entity';

export * from './work-item.entity';
import { QualityAssessmentBallot } from './quality-assessment-ballot.entity';
import { QualityAssessmentItem } from './quality-assessment-item.entity';
import { AcceptanceRepairBallot } from './acceptance-repair-ballot.entity';
import { SettlementRepairBallot } from './settlement-repair-ballot.entity';
import { SettlementRepairMaterial } from './settlement-repair-material.entity';
import { SettlementRepairLabor } from './settlement-repair-labor.entity';
import { HistoryRepair } from './history-repair.entity';

export const entities = [
  RoleSystem,
  User,
  EquipmentType,
  LocationEquipment,
  Equipment,
  Department,
  Position,
  Permission,
  PositionPermission,
  MaterialType,
  Material,
  HistoryEquipment,
  AssignmentBallot,
  MaterialSupplyBallot,
  DetailAppraisalBallot,
  TechnicalAppraisalBallot,
  MaterialSupplyBallotDetail,
  DetailAppraisalBallotItem,
  WorkItem,
  AssignmentBallotApproval,
  RepairRequest,
  QualityAssessmentBallot,
  QualityAssessmentItem,
  AcceptanceRepairBallot,
  SettlementRepairBallot,
  SettlementRepairMaterial,
  SettlementRepairLabor,
  HistoryRepair,
];
