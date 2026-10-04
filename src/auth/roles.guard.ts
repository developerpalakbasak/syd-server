import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Extract the required roles for this specific route from metadata.
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. If no roles are defined on the route, we allow access by default.
    // (If you want routes to be secure by default, you would return false here instead).
    if (!requiredRoles) {
      return true;
    }

    // 3. Extract the current user from the request.
    // Typically, an AuthGuard (like a JWT guard) runs before this RolesGuard.
    // The AuthGuard decodes the JWT and attaches the user payload to request.user.
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      throw new ForbiddenException('User roles not found');
    }

    // 4. Compare the user's roles with the required roles.
    // We check if the user has AT LEAST ONE of the required roles.
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException('You do not have the required permissions to perform this action');
    }

    return true;
  }
}
