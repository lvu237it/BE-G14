import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { envConfig } from './config/env.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Bootstrap function - Entry point of NestJS application
 * Initialize app, configure middleware and start server
 */
async function bootstrap() {
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);

  // Configure CORS to allow frontend to call API
  // credentials: true allows sending cookies
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://frontend-asset-and-equipment-repair.vercel.app',
      'https://aka-fe-g14.vercel.app',
      process.env.FRONTEND_URL,
    ],
    credentials: true,
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Middleware to parse cookies from request
  // Required to read accessToken and refresh_token from cookies
  app.use(cookieParser());

  // Global validation pipe to validate all incoming requests
  // whitelist: true - only allow properties defined in DTOs
  // forbidNonWhitelisted: true - reject requests with undefined properties
  // transform: true - automatically transform data types (string -> Date, number, etc.)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter để đảm bảo mọi lỗi trả về đúng chuẩn giao diện
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle(
      'Hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35 - API',
    )
    .setDescription(
      'Tài liệu API cho hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35',
    )
    .setVersion('1.0')
    .addTag('Xác thực')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Nhập JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addCookieAuth('accessToken', {
      type: 'apiKey',
      in: 'cookie',
      name: 'accessToken',
      description: 'Access token được lưu trong cookie HTTP-only',
    })
    .addCookieAuth('refresh_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'refresh_token',
      description: 'Refresh token được lưu trong cookie HTTP-only',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle:
      'Tài liệu API - Hệ thống quản lý vật tư và quy trình sửa chữa thiết bị cho công ty 35',
    customCss: `
      .swagger-ui section.models { display: none !important; }
      .swagger-ui .models { display: none !important; }
      .swagger-ui .opblock-tag-section .models { display: none !important; }
      .swagger-ui .information-container { margin-bottom: 0; }
    `,
  });

  // Get port from environment config and start server
  const port = process.env.PORT || envConfig.APP_PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(
    `📚 Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

// Graceful handlers to avoid process crash
process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('Uncaught Exception:', err);
});

// Start the application safely
bootstrap().catch((err) => {
  console.error('Failed to bootstrap application:', err);
});
