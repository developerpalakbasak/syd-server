import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Route, RouteSchema } from './schemas/route.schema.js';
import { RoutesService } from './routes.service.js';
import { RoutesController } from './routes.controller.js';

// Module bundling route schema registration, controller endpoints, and service provider.
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Route.name, schema: RouteSchema }]),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService, MongooseModule],
})
export class RoutesModule {}
