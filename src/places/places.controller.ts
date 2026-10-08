import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PlacesService } from './places.service.js';
import { CreatePlaceDto } from './dto/create-place.dto.js';
import { UpdatePlaceDto } from './dto/update-place.dto.js';
import { QueryPlaceDto } from './dto/query-place.dto.js';

// Controller handling admin place route fare catalog and lookup endpoints.
@Controller('places')
export class PlacesController {
  // Injects PlacesService dependency for place fare database operations.
  constructor(private readonly placesService: PlacesService) {}

  // GET /api/v1/places - Retrieves place route fares with optional filters and pagination.
  @Get()
  async findAll(@Query() query: QueryPlaceDto) {
    const data = await this.placesService.findAll(query);
    return {
      success: true,
      ...data,
    };
  }

  // GET /api/v1/places/lookup?firstPlace=...&lastPlace=... - Looks up fare for a specific route.
  @Get('lookup')
  async lookup(
    @Query('firstPlace') firstPlace: string,
    @Query('lastPlace') lastPlace: string,
  ) {
    const place = await this.placesService.findByRoute(firstPlace, lastPlace);
    return {
      success: true,
      place,
    };
  }

  // POST /api/v1/places/seed - Seeds predefined default route fares into the database.
  @Post('seed')
  async seed() {
    return this.placesService.seedDefaultPlaces();
  }

  // GET /api/v1/places/:id - Retrieves a single place route fare by MongoDB ObjectId.
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const place = await this.placesService.findById(id);
    return {
      success: true,
      place,
    };
  }

  // POST /api/v1/places - Creates and registers a new place route fare.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPlaceDto: CreatePlaceDto) {
    const place = await this.placesService.create(createPlaceDto);
    return {
      success: true,
      message: 'Place route fare created successfully',
      place,
    };
  }

  // PATCH /api/v1/places/:id - Updates details of an existing place route fare by ID.
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePlaceDto: UpdatePlaceDto,
  ) {
    const place = await this.placesService.update(id, updatePlaceDto);
    return {
      success: true,
      message: 'Place route fare updated successfully',
      place,
    };
  }

  // DELETE /api/v1/places/:id - Deletes a place route fare from the database by ID.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.placesService.remove(id);
  }
}
