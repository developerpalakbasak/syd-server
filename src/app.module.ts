import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { RoutesModule } from './routes/routes.module.js';
import { AdminModule } from './admin/admin.module.js';
import { DriversModule } from './drivers/drivers.module.js';
import { QuotesModule } from './quotes/quotes.module.js';
import { PassengersModule } from './passengers/passengers.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Root application module configuring global environment variables, MongoDB database connection, and feature modules.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri:
          config.get<string>('MONGODB_URI') ||
          'mongodb://127.0.0.1:27017/syd',
      }),
    }),
    VehiclesModule,
    BookingsModule,
    RoutesModule,
    AdminModule,
    DriversModule,
    QuotesModule,
    PassengersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
