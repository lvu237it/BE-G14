export const positionSignMapMSB: Record<string, string> = {
  lead_warehouse: 'lead_warehouse_id',
  TK: 'lead_warehouse_id',
  thukho: 'lead_warehouse_id',
  tk: 'lead_warehouse_id',
  transport_mechanic: 'transport_mechanic_id',
  cdvt: 'transport_mechanic_id',
  pcdvt: 'transport_mechanic_id',
  cđvt: 'transport_mechanic_id',
  PCĐVT: 'transport_mechanic_id',
  CDVT: 'transport_mechanic_id',
  receiver: 'receiver_id',
  pqđ: 'deputy_foreman_id',
  pqd: 'deputy_foreman_id',
  PQD: 'deputy_foreman_id',
  PQĐ: 'deputy_foreman_id',
  PQĐCĐ: 'deputy_foreman_id',
  PQDCĐ: 'deputy_foreman_id',
  TT: 'receiver_id',
  tt: 'receiver_id',
  NVH: 'receiver_id',
  Operator: 'receiver_id',
  // Thêm vai trò mới ở đây nếu cần
};

// Map cho Technical Appraisal Ballot và Detail Appraisal Ballot và Acceptance Repair Ballot
export const appraisalBallotSignMap: Record<string, string> = {
  operator: 'operator_id',
  equipment_manager: 'equipment_manager_id',
  repairman: 'repairman_id',
  transport_mechanic: 'transport_mechanic_id',
  cdvt: 'transport_mechanic_id',
  pcdvt: 'transport_mechanic_id',
  cđvt: 'transport_mechanic_id',
  PCĐVT: 'transport_mechanic_id',
  CDVT: 'transport_mechanic_id',
  // các alias khác nếu có thực tế từ DB
  TT: 'operator_id',
  tt: 'operator_id',
  NVH: 'operator_id',
  nvh: 'operator_id',
  Operator: 'operator_id',
  // Phó quản đốc (PQD, PQĐ) - xử lý đặc biệt trong service (có thể ký equipment_manager_id hoặc repairman_id)
  pqđ: 'equipment_manager_id',
  pqd: 'equipment_manager_id',
  // Thủ kho
  tk: 'operator_id',
  thukho: 'operator_id',
  TK: 'operator_id',
  THUKHO: 'operator_id',
};

export const acceptainceRepairBallotSignMap = {
  nvh: 'operator_id',
  operator: 'operator_id',
  tt: 'operator_id',
  cdvt: 'transport_mechanic_id',
  pcdvt: 'transport_mechanic_id',
  cđvt: 'transport_mechanic_id',
  PCĐVT: 'transport_mechanic_id',
  CDVT: 'transport_mechanic_id',
  qd: 'equipment_manager_id',
  pqd: 'repairman_id',
};

export const qualityAssessmentBallotSignMap = {
  tpkhdt: 'lead_first_plan',
  tptckt: 'lead_finance_accounting_id',
  pgd: 'deputy_director_id',
  tpcdvt: 'lead_transport_mechanic',
};

export const assignmentBallotSignMap = {
  pgd: 'assign_by',
};

export const settlementRepairBallotSignMap = {
  qd: 'site_manager_id',
};
