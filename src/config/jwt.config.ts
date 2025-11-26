export const jwtConfig = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d',
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '14d',
  },
  cookie: {
    accessTokenName: 'accessToken',
    refreshTokenName: 'refresh_token',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
};
