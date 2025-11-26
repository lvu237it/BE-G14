import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const rawUser = request.user ?? {};
    const normalizedId =
      rawUser.id ?? rawUser.userId ?? rawUser.sub ?? rawUser.uid ?? null;
    // Ensure downstream always sees an `id` if possible
    const userWithId = normalizedId
      ? { id: normalizedId, ...rawUser }
      : rawUser;
    if (data && typeof data === 'string') {
      return userWithId[data as keyof typeof userWithId];
    }
    return userWithId;
  },
);
