import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Xin chào, đây là API của hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35';
  }
}
