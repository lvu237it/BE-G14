export interface ApiResponse<T = any> {
  errCode: string;
  reason: string;
  result: 'SUCCESS' | 'ERROR';
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  errCode: string;
  reason: string;
  result: 'ERROR';
}

export const ApiResponseHelper = {
  success<T>(data: T, reason = 'Thành công', errCode = '00'): ApiResponse<T> {
    return {
      errCode,
      reason,
      result: 'SUCCESS',
      data,
    };
  },

  error(reason: string, errCode: string): ErrorResponse {
    return {
      errCode,
      reason,
      result: 'ERROR',
    };
  },
};
