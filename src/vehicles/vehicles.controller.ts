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

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

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

  @Post('seed')
  async seed() {
    return this.vehiclesService.seedDefaultVehicles();
  }

  @Get(':idOrSlug')
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    if (isValidObjectId(idOrSlug)) {
      const vehicle = await this.vehiclesService.findById(idOrSlug);
      return { success: true, vehicle };
    }
    const vehicle = await this.vehiclesService.findBySlug(idOrSlug);
    return { success: true, vehicle };
  }

  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    const vehicle = await this.vehiclesService.create(createVehicleDto);
    return { success: true, message: 'Vehicle created successfully', vehicle };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    const vehicle = await this.vehiclesService.update(id, updateVehicleDto);
    return { success: true, message: 'Vehicle updated successfully', vehicle };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.vehiclesService.remove(id);
  }
}
