import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { isValidObjectId } from 'mongoose';
import { VehiclesService } from './vehicles.service.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

// Controller handling vehicle fleet catalog endpoints and operations.
@Controller('vehicles')
export class VehiclesController {
  // Injects VehiclesService dependency for fleet database operations.
  constructor(private readonly vehiclesService: VehiclesService) {}

  // GET /api/v1/vehicles - Retrieves all vehicles matching optional service, passenger, and active status filters.
  @Get()
  async findAll(
    @Query('service') service?: string,
    @Query('pax') pax?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    const paxNum = pax ? parseInt(pax, 10) : undefined;
    const vehicles = await this.vehiclesService.findAll({
      service,
      pax: paxNum,
      isActive: activeBool,
    });
    return { success: true, count: vehicles.length, vehicles };
  }

  // POST /api/v1/vehicles/seed - Seeds predefined default fleet vehicles into the database.
  @Post('seed')
  async seed() {
    return this.vehiclesService.seedDefaultVehicles();
  }

  // GET /api/v1/vehicles/:idOrSlug - Retrieves a single vehicle by either MongoDB ObjectId or URL slug.
  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    if (isValidObjectId(idOrSlug)) {
      const vehicle = await this.vehiclesService.findById(idOrSlug);
      return { success: true, vehicle };
    }
    const vehicle = await this.vehiclesService.findBySlug(idOrSlug);
    return { success: true, vehicle };
  }

  // POST /api/v1/vehicles - Creates and registers a new vehicle in the fleet catalog.
  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(createVehicleDto);
    return { success: true, message: 'Vehicle created successfully', vehicle };
  }

  // PATCH /api/v1/vehicles/:id - Updates details of an existing vehicle by ID.
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const vehicle = await this.vehiclesService.update(id, updateVehicleDto);
    return { success: true, message: 'Vehicle updated successfully', vehicle };
  }

  // DELETE /api/v1/vehicles/:id - Deletes a vehicle from the fleet catalog by ID.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
