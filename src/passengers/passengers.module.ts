import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Passenger, PassengerSchema } from './schemas/passenger.schema.js';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema.js';
import { PassengersController } from './passengers.controller.js';
import { PassengersService } from './passengers.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Passenger.name, schema: PassengerSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [PassengersController],
  providers: [PassengersService],
  exports: [PassengersService, MongooseModule],
})
export class PassengersModule {}
