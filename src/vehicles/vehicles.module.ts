import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehicle, VehicleSchema } from './schemas/vehicle.schema.js';
import { VehiclesService } from './vehicles.service.js';
import { VehiclesController } from './vehicles.controller.js';

// Module bundling vehicle schema registration, controller endpoints, and service provider.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vehicle.name, schema: VehicleSchema }]),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService, MongooseModule],
})
export class VehiclesModule {}
