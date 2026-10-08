import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Place, PlaceSchema } from './schemas/place.schema.js';
import { PlacesService } from './places.service.js';
import { PlacesController } from './places.controller.js';

// Module bundling place schema registration, controller endpoints, and service provider.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService, MongooseModule],
})
export class PlacesModule {}
