import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Map HTTP status to error codes
    let errCode: string = ERROR_CODES.INTERNAL_SERVER_ERROR;
    let reason: string = ERROR_MESSAGES[ERROR_CODES.INTERNAL_SERVER_ERROR];

    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        errCode = ERROR_CODES.UNAUTHORIZED;
        reason = ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED];
        break;
      case HttpStatus.FORBIDDEN:
        errCode = ERROR_CODES.FORBIDDEN;
        reason = ERROR_MESSAGES[ERROR_CODES.FORBIDDEN];
        break;
      case HttpStatus.BAD_REQUEST:
        errCode = ERROR_CODES.VALIDATION_ERROR;
        reason = ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR];
        break;
      case HttpStatus.NOT_FOUND:
        errCode = ERROR_CODES.RECORD_NOT_FOUND;
        reason = ERROR_MESSAGES[ERROR_CODES.RECORD_NOT_FOUND];
        break;
      case HttpStatus.CONFLICT:
        errCode = ERROR_CODES.DUPLICATE_RECORD;
        reason = ERROR_MESSAGES[ERROR_CODES.DUPLICATE_RECORD];
        break;
    }

    // Get custom error message if available
    const exceptionResponse = exception.getResponse() as any;
    if (exceptionResponse?.message) {
      reason = Array.isArray(exceptionResponse.message)
        ? exceptionResponse.message[0]
        : exceptionResponse.message;
    }

    const errorResponse = {
      errCode,
      reason,
      result: 'ERROR' as const,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    response.status(status).json(errorResponse);
  }
}
