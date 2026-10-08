import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PlacesModule } from './places/places.module.js';
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
    PlacesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
