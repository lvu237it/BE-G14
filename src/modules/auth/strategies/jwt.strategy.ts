import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { jwtConfig } from 'src/config/jwt.config';
import { ERROR_CODES, ERROR_MESSAGES } from 'src/common/constants/error-codes';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => {
        let token = null;
        if (req && req.cookies && req.cookies.accessToken) {
          token = req.cookies.accessToken;
        } else if (
          req &&
          req.headers &&
          req.headers.authorization &&
          req.headers.authorization.startsWith('Bearer ')
        ) {
          token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
          throw new UnauthorizedException({
            errCode: ERROR_CODES.UNAUTHORIZED,
            message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED],
          });
        }
        return token;
      },
      ignoreExpiration: false,
      secretOrKey: jwtConfig.accessToken.secret,
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      phone: payload.phone,
      roleSystem: payload.roleSystem,
      status: payload.status,
      position_id: payload.position_id,
    };
  }
}
