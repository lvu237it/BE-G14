import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { convertObjectToVietnamTime } from '../utils/timezone.util';

/**
 * Interceptor để convert tất cả Date fields sang Vietnam Timezone (UTC+7)
 * Tự động apply cho tất cả responses
 */
@Injectable()
export class VietnamTimezoneInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Convert tất cả Date fields sang Vietnam timezone
        return convertObjectToVietnamTime(data);
      }),
    );
  }
}
