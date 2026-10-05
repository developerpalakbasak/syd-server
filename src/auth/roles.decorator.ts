import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../user/user.enums.js';

export const ROLES_KEY = 'roles';

/**
 * The @Roles() decorator tags routes with roles required to access them.
 * Accounts are only required for DRIVER and ADMIN roles.
 * 
 * Example usage: @Roles(UserRole.DRIVER, UserRole.ADMIN)
 */
export const Roles = (...roles: (UserRole | string)[]) => SetMetadata(ROLES_KEY, roles);
