import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<Role[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    // No role restriction
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        'Please Login First',
      );
    }

    return requiredRoles.includes(user.role);
  }
}