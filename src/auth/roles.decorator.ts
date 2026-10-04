import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * The @Roles() decorator allows us to tag route handlers with specific roles
 * required to access the endpoint. It uses NestJS's SetMetadata to attach 
 * custom metadata (the roles array) to the route's context.
 * 
 * Example usage: @Roles('CUSTOMER', 'ADMIN')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
