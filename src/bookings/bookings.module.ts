import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './schemas/booking.schema.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';
import { VehiclesModule } from '../vehicles/vehicles.module.js';
import { QuotesModule } from '../quotes/quotes.module.js';

import { Passenger, PassengerSchema } from '../passengers/schemas/passenger.schema.js';

// Module bundling booking schema registration, controller endpoints, service provider, and vehicle dependencies.
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Passenger.name, schema: PassengerSchema },
    ]),
    VehiclesModule,
    QuotesModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService, MongooseModule],
})
export class BookingsModule {}
