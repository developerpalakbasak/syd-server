import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotesController } from './quotes.controller.js';
import { QuotesService } from './quotes.service.js';
import { Vehicle, VehicleSchema } from '../vehicles/schemas/vehicle.schema.js';
import { Route, RouteSchema } from '../routes/schemas/route.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehicle.name, schema: VehicleSchema },
      { name: Route.name, schema: RouteSchema },
    ]),
  ],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
