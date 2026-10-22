import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './schemas/admin.schema.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';
import { AdminAuthMiddleware } from './admin-auth.middleware.js';

import { Driver, DriverSchema } from '../drivers/schemas/driver.schema.js';

// Module configuring administrative user schemas, endpoints, and management services.
// Uses 'Admin' entity (and 'admins' collection) so 'User'/'users' remains available for customer accounts.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Admin.name, schema: AdminSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthMiddleware],
  exports: [AdminService, MongooseModule],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminAuthMiddleware)
      .exclude(
        { path: 'admins/login', method: RequestMethod.POST },
        { path: 'admins/seed', method: RequestMethod.POST },
        { path: 'admins/refresh-token', method: RequestMethod.POST },
      )
      .forRoutes(AdminController);
  }
}
