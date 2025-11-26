import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { envConfig } from 'src/config/env.config';
import { jwtConfig } from 'src/config/jwt.config';
import { RoleSystem, User } from 'src/entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

export const RedisProvider = {
  provide: 'REDIS',
  useFactory: () => {
    return new Redis(envConfig.REDIS_URI);
  },
};

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RoleSystem]),
    JwtModule.register({
      secret: jwtConfig.accessToken.secret,
      signOptions: { expiresIn: jwtConfig.accessToken.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RedisProvider],
  exports: [AuthService],
})
export class AuthModule {}
