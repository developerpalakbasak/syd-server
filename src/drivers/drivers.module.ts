import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Driver, DriverSchema } from './schemas/driver.schema.js';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema.js';
import { DriversController } from './drivers.controller.js';
import { DriversService } from './drivers.service.js';
import { BookingsModule } from '../bookings/bookings.module.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Driver.name, schema: DriverSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    BookingsModule,
  ],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
})
export class DriversModule {}
