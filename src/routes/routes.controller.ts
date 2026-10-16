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
import { RoutesService } from './routes.service.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { QueryRouteDto } from './dto/query-route.dto.js';

// Controller handling admin routes fare catalog and lookup endpoints.
@Controller('routes')
export class RoutesController {
  // Injects RoutesService dependency for route fare database operations.
  constructor(private readonly routesService: RoutesService) {}

  // GET /api/v1/routes - Retrieves route fares with optional filters and pagination.
  @Get()
  async findAll(@Query() query: QueryRouteDto) {
    if (query?.unique === 'true' || query?.format === 'names') {
      const activeBool =
        query?.isActive !== undefined && query.isActive !== ''
          ? query.isActive === 'true'
          : undefined;
      const places = await this.routesService.getAllUniquePlaces({
        isActive: activeBool,
        search: query?.search,
      });
      return {
        success: true,
        count: places.length,
        places,
      };
    }

    const data = await this.routesService.findAll(query);
    return {
      success: true,
      ...data,
    };
  }

  // GET /api/v1/routes/all - Retrieves a unique deduplicated array of all firstPlace and lastPlace names.
  // Guarantees each place appears exactly once in the returned array.
  // Also accessible via /routes/unique, /routes/names, /routes/all-places
  @Get(['all', 'names', 'unique', 'all-places'])
  async getAllPlaces(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('q') q?: string,
    @Query('raw') raw?: string,
    @Query('details') details?: string,
  ) {
    const activeBool =
      isActive !== undefined && isActive !== '' ? isActive === 'true' : undefined;
    const searchTerm = q || search;
    const withDetails = details === 'true';

    if (withDetails) {
      const places = await this.routesService.getAllUniquePlacesWithDetails({
        isActive: activeBool,
        search: searchTerm,
      });
      if (raw === 'true') {
        return places;
      }
      return {
        success: true,
        count: places.length,
        places,
      };
    }

    const places = await this.routesService.getAllUniquePlaces({
      isActive: activeBool,
      search: searchTerm,
    });

    if (raw === 'true') {
      return places;
    }

    return {
      success: true,
      count: places.length,
      places,
    };
  }

  // GET /api/v1/routes/search?q=... - Autocomplete search for places (used by place input dropdowns)
  @Get('search')
  async searchPlaces(
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('details') details?: string,
  ) {
    const searchTerm = q || search;
    const activeBool =
      isActive !== undefined && isActive !== '' ? isActive === 'true' : undefined;
    const withDetails = details !== 'false';

    if (withDetails) {
      const places = await this.routesService.getAllUniquePlacesWithDetails({
        isActive: activeBool,
        search: searchTerm,
      });
      return {
        success: true,
        count: places.length,
        places,
      };
    }

    const places = await this.routesService.getAllUniquePlaces({
      isActive: activeBool,
      search: searchTerm,
    });

    return {
      success: true,
      count: places.length,
      places,
    };
  }

  // GET /api/v1/routes/destinations?from=... - Retrieves all available destination places connected to a given origin place.
  @Get('destinations')
  async getConnectedDestinations(
    @Query('from') from?: string,
    @Query('pickup') pickup?: string,
    @Query('firstPlace') firstPlace?: string,
    @Query('origin') origin?: string,
    @Query('isActive') isActive?: string,
  ) {
    const originPlace = from || pickup || firstPlace || origin;
    const activeBool =
      isActive !== undefined && isActive !== '' ? isActive === 'true' : true;
    const places = await this.routesService.getConnectedPlaces(originPlace, activeBool);
    return {
      success: true,
      origin: originPlace,
      count: places.length,
      places,
    };
  }

  // GET /api/v1/routes/lookup?firstPlace=...&lastPlace=... - Looks up fare for a specific route.
  @Get('lookup')
  async lookup(
    @Query('firstPlace') firstPlace?: string,
    @Query('lastPlace') lastPlace?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('pickup') pickup?: string,
    @Query('destination') destination?: string,
  ) {
    const origin = firstPlace || from || pickup;
    const dest = lastPlace || to || destination;
    const route = await this.routesService.findByRoute(origin, dest);
    return {
      success: true,
      route,
      place: route,
    };
  }

  // GET /api/v1/routes/route/:firstPlace/:lastPlace - Path parameter lookup alternative
  @Get('route/:firstPlace/:lastPlace')
  async lookupByPath(
    @Param('firstPlace') firstPlace: string,
    @Param('lastPlace') lastPlace: string,
  ) {
    const route = await this.routesService.findByRoute(firstPlace, lastPlace);
    return {
      success: true,
      route,
      place: route,
    };
  }

  // POST /api/v1/routes/seed - Seeds predefined default route fares into the database.
  @Post('seed')
  async seed() {
    return this.routesService.seedDefaultPlaces();
  }

  // GET /api/v1/routes/:id - Retrieves a single route fare by MongoDB ObjectId.
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const route = await this.routesService.findById(id);
    return {
      success: true,
      route,
      place: route,
    };
  }

  // POST /api/v1/routes - Creates and registers a new route fare.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRouteDto: CreateRouteDto) {
    const route = await this.routesService.create(createRouteDto);
    return {
      success: true,
      message: 'Route fare created successfully',
      route,
      place: route,
    };
  }

  // PATCH /api/v1/routes/:id - Updates details of an existing route fare by ID.
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto,
  ) {
    const route = await this.routesService.update(id, updateRouteDto);
    return {
      success: true,
      message: 'Route fare updated successfully',
      route,
      place: route,
    };
  }

  // DELETE /api/v1/routes/:id - Deletes a route fare from the database by ID.
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }
}
