import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Admin, AdminSchema } from './schemas/admin.schema.js';
import { AdminService } from './admin.service.js';
import { AdminController } from './admin.controller.js';

// Module configuring administrative user schemas, endpoints, and management services.
// Uses 'Admin' entity (and 'admins' collection) so 'User'/'users' remains available for customer accounts.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService, MongooseModule],
})
export class AdminModule {}
