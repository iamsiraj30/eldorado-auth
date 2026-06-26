import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): any => {
    const req = ctx.switchToHttp().getRequest();

    return req.user;
  },
);
