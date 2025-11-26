import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Xin chào, đây là API của hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35"', () => {
      expect(appController.getHello()).toBe(
        'Xin chào, đây là API của hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35',
      );
    });
  });
});
