export const ERROR_CODES = {
  // Success
  SUCCESS: 'E000',

  // Authentication & Authorization
  UNAUTHORIZED: 'E001',
  FORBIDDEN: 'E002',
  INVALID_CREDENTIALS: 'E003',
  TOKEN_EXPIRED: 'E004',
  INSUFFICIENT_PERMISSIONS: 'E005',
  ACCOUNT_LOCKED: 'E006',
  INVALID_REFRESH_TOKEN: 'E007',
  TOKEN_REVOKED: 'E008',

  // Validation
  VALIDATION_ERROR: 'E010',
  INVALID_INPUT: 'E011',
  MISSING_REQUIRED_FIELD: 'E012',
  PHONE_EMPTY: 'E013',
  PASSWORD_EMPTY: 'E014',
  WRONG_PASSWORD: 'E015',
  SAME_PASSWORD: 'E016',

  // Database & Resource
  DATABASE_ERROR: 'E020',
  RECORD_NOT_FOUND: 'E021',
  DUPLICATE_RECORD: 'E022',
  CONSTRAINT_VIOLATION: 'E023',

  // User-specific
  USER_NOT_FOUND: 'E030',
  USER_PHONE_EXISTS: 'E031',
  USER_CODE_EXISTS: 'E032',
  USER_CARD_NUMBER_EXISTS: 'E033',
  USER_INACTIVE: 'E034',

  // Department-specific
  DEPARTMENT_NOT_FOUND: 'E040',
  DEPARTMENT_CODE_EXISTS: 'E041',
  DEPARTMENT_NAME_EXISTS: 'E042',
  DEPARTMENT_PARENT_NOT_FOUND:'E061',
  DEPARTMENT_INVALID_PARENT:'E062',


  // Permission-specific
  PERMISSION_NOT_FOUND: 'E050',
  POSITION_NOT_ASSIGNED: 'E051',
  NO_PERMISSIONS_ASSIGNED: 'E052',
  MISSING_REQUIRED_PERMISSION: 'E053',


  // Position
  POSITION_DUPLICATE_RECORD: 'E054',
  POSITION_VALIDATE_NAME: 'E055',
  POSITION_NOT_FOUND: 'E056',
  POSITION_VALIDATE_CODE: 'E063',

  // Material
  CODE_NULL: 'E060',

  // System
  INTERNAL_SERVER_ERROR: 'E999',
  SERVICE_UNAVAILABLE: 'E998',
  EXTERNAL_SERVICE_ERROR: 'E997',

  // Material
} as const;
export const ERROR_MESSAGES = {
  [ERROR_CODES.SUCCESS]: 'Thành công',

  // Auth
  [ERROR_CODES.UNAUTHORIZED]: 'Không có quyền truy cập',
  [ERROR_CODES.FORBIDDEN]: 'Truy cập bị cấm',
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Mật khẩu không hợp lệ',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Token đã hết hạn',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Không đủ quyền truy cập chức năng',
  [ERROR_CODES.ACCOUNT_LOCKED]: 'Tài khoản đã bị khóa',
  [ERROR_CODES.INVALID_REFRESH_TOKEN]:
    'Refresh token không hợp lệ hoặc đã bị thu hồi',
  [ERROR_CODES.TOKEN_REVOKED]: 'Token đã bị thu hồi hoặc hết hiệu lực',

  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'Lỗi xác thực',
  [ERROR_CODES.INVALID_INPUT]: 'Dữ liệu nhập không hợp lệ',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Trường bắt buộc không được để trống',
  [ERROR_CODES.PHONE_EMPTY]: 'Số điện thoại không được để trống',
  [ERROR_CODES.PASSWORD_EMPTY]: 'Mật khẩu không được để trống',
  [ERROR_CODES.WRONG_PASSWORD]: 'Mật khẩu không hợp lệ',
  [ERROR_CODES.SAME_PASSWORD]:
    'Mật khẩu mới không được trùng với mật khẩu hiện tại',

  // Database
  [ERROR_CODES.DATABASE_ERROR]: 'Lỗi cơ sở dữ liệu',
  [ERROR_CODES.RECORD_NOT_FOUND]: 'Không tìm thấy dữ liệu',
  [ERROR_CODES.DUPLICATE_RECORD]: 'Dữ liệu đã tồn tại',
  [ERROR_CODES.CONSTRAINT_VIOLATION]: 'Vi phạm ràng buộc',

  // User
  [ERROR_CODES.USER_NOT_FOUND]:
    'Không tìm thấy người dùng hoặc tài khoản đã bị xoá',
  [ERROR_CODES.USER_PHONE_EXISTS]: 'Số điện thoại đã tồn tại',
  [ERROR_CODES.USER_CODE_EXISTS]: 'Mã nhân viên đã tồn tại',
  [ERROR_CODES.USER_CARD_NUMBER_EXISTS]: 'CCCD/CMND đã tồn tại',
  [ERROR_CODES.USER_INACTIVE]: 'Tài khoản đã bị dừng hoạt động',

  // Department
  [ERROR_CODES.DEPARTMENT_NOT_FOUND]: 'Không tìm thấy phòng ban',
  [ERROR_CODES.DEPARTMENT_CODE_EXISTS]: 'Mã phòng ban đã tồn tại',
  [ERROR_CODES.DEPARTMENT_NAME_EXISTS]: 'Tên phòng ban đã tồn tại',
  [ERROR_CODES.DEPARTMENT_PARENT_NOT_FOUND]: 'Phòng ban cha không tồn tại',
  [ERROR_CODES.DEPARTMENT_INVALID_PARENT]: 'Phòng ban cha không được là chính nó',
  // Position
  [ERROR_CODES.POSITION_DUPLICATE_RECORD]:
    'Tên chức danh đã tồn tại trong phòng ban này',
  [ERROR_CODES.POSITION_NOT_FOUND]:
    'Tên chức danh đã tồn tại trong phòng ban này',
  [ERROR_CODES.POSITION_VALIDATE_NAME]: 'Tên chức danh không được để trống',
  [ERROR_CODES.POSITION_VALIDATE_CODE]: 'Tên chức danh không được để trống',

  // Permission
  [ERROR_CODES.PERMISSION_NOT_FOUND]:
    'Không tìm thấy quyền truy cập tương ứng.',
  [ERROR_CODES.POSITION_NOT_ASSIGNED]:
    'Bạn chưa được gán chức vụ, không có quyền truy cập.',
  [ERROR_CODES.NO_PERMISSIONS_ASSIGNED]:
    'Chức vụ của bạn chưa được gán quyền truy cập nào.',
  [ERROR_CODES.MISSING_REQUIRED_PERMISSION]:
    'Bạn không có quyền thực hiện hành động này.',

  // Material
  [ERROR_CODES.CODE_NULL]: 'Mã của vật tư không được trống',

  // System
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'Lỗi máy chủ nội bộ',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Dịch vụ không khả dụng',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'Lỗi dịch vụ ngoại vi',
} as const;
