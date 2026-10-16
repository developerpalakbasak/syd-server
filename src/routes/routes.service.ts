import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Route, RouteDocument } from './schemas/route.schema.js';
import { CreateRouteDto } from './dto/create-route.dto.js';
import { UpdateRouteDto } from './dto/update-route.dto.js';
import { QueryRouteDto } from './dto/query-route.dto.js';

// Helper to safely escape regex characters including parentheses, dots, brackets
function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Interface for unique place details with optional coordinates and code
export interface UniquePlaceDetail {
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  code?: string;
}

// Service managing admin routes fares, lookups, and seeding.
@Injectable()
export class RoutesService {
  // Injects Mongoose Model for Route collection.
  constructor(
    @InjectModel(Route.name)
    private readonly routeModel: Model<RouteDocument>,
  ) {}

  // Retrieves a unique deduplicated list of all place names from firstPlace and lastPlace.
  // Guarantees each place appears exactly once in the returned array.
  async getAllUniquePlaces(options?: {
    isActive?: boolean;
    search?: string;
  }): Promise<string[]> {
    const filter: Record<string, any> = {};
    if (options?.isActive !== undefined) {
      filter.isActive = options.isActive;
    }

    const [firstPlaces, lastPlaces] = await Promise.all([
      this.routeModel.distinct('firstPlace', filter).exec(),
      this.routeModel.distinct('lastPlace', filter).exec(),
    ]);

    const uniqueMap = new Map<string, string>();
    for (const place of [...(firstPlaces || []), ...(lastPlaces || [])]) {
      if (typeof place === 'string') {
        const trimmed = place.trim();
        if (trimmed.length > 0) {
          const lowerKey = trimmed.toLowerCase();
          if (!uniqueMap.has(lowerKey)) {
            uniqueMap.set(lowerKey, trimmed);
          }
        }
      }
    }

    let places = Array.from(uniqueMap.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );

    if (options?.search) {
      const searchLower = options.search.trim().toLowerCase();
      places = places.filter((p) => p.toLowerCase().includes(searchLower));
    }

    return places;
  }

  // Retrieves unique places with address, coordinates, and codes from firstPlace and lastPlace metadata.
  async getAllUniquePlacesWithDetails(options?: {
    isActive?: boolean;
    search?: string;
  }): Promise<UniquePlaceDetail[]> {
    const filter: Record<string, any> = {};
    if (options?.isActive !== undefined) {
      filter.isActive = options.isActive;
    }

    const routes = await this.routeModel
      .find(filter)
      .select('firstPlace lastPlace firstPlaceDetails lastPlaceDetails')
      .lean()
      .exec();

    const uniqueMap = new Map<string, UniquePlaceDetail>();

    for (const route of routes) {
      if (route.firstPlace && typeof route.firstPlace === 'string') {
        const trimmed = route.firstPlace.trim();
        if (trimmed.length > 0) {
          const lowerKey = trimmed.toLowerCase();
          if (!uniqueMap.has(lowerKey)) {
            const details = route.firstPlaceDetails;
            uniqueMap.set(lowerKey, {
              name: trimmed,
              address: details?.address || '',
              lat: details?.lat,
              lng: details?.lng,
              code: details?.code || '',
            });
          } else {
            const existing = uniqueMap.get(lowerKey)!;
            const details = route.firstPlaceDetails;
            if (details) {
              if (!existing.address && details.address) existing.address = details.address;
              if (existing.lat === undefined && details.lat !== undefined) existing.lat = details.lat;
              if (existing.lng === undefined && details.lng !== undefined) existing.lng = details.lng;
              if (!existing.code && details.code) existing.code = details.code;
            }
          }
        }
      }

      if (route.lastPlace && typeof route.lastPlace === 'string') {
        const trimmed = route.lastPlace.trim();
        if (trimmed.length > 0) {
          const lowerKey = trimmed.toLowerCase();
          if (!uniqueMap.has(lowerKey)) {
            const details = route.lastPlaceDetails;
            uniqueMap.set(lowerKey, {
              name: trimmed,
              address: details?.address || '',
              lat: details?.lat,
              lng: details?.lng,
              code: details?.code || '',
            });
          } else {
            const existing = uniqueMap.get(lowerKey)!;
            const details = route.lastPlaceDetails;
            if (details) {
              if (!existing.address && details.address) existing.address = details.address;
              if (existing.lat === undefined && details.lat !== undefined) existing.lat = details.lat;
              if (existing.lng === undefined && details.lng !== undefined) existing.lng = details.lng;
              if (!existing.code && details.code) existing.code = details.code;
            }
          }
        }
      }
    }

    let places = Array.from(uniqueMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );

    if (options?.search) {
      const searchLower = options.search.trim().toLowerCase();
      places = places.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          (p.code && p.code.toLowerCase().includes(searchLower)) ||
          (p.address && p.address.toLowerCase().includes(searchLower)),
      );
    }

    return places;
  }

  // Retrieves all unique destination places that have an active route connected to the given origin place.
  async getConnectedPlaces(origin?: string, isActive = true): Promise<UniquePlaceDetail[]> {
    if (!origin || origin.trim().length === 0) {
      return this.getAllUniquePlacesWithDetails({ isActive });
    }

    const cleanOrigin = origin.trim();
    const escaped = escapeRegex(cleanOrigin);

    const filter: Record<string, any> = {
      $or: [
        { firstPlace: new RegExp(`^${escaped}$`, 'i') },
        { lastPlace: new RegExp(`^${escaped}$`, 'i') },
        { firstPlace: new RegExp(escaped, 'i') },
        { lastPlace: new RegExp(escaped, 'i') },
      ],
    };

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const connectedRoutes = await this.routeModel
      .find(filter)
      .select('firstPlace lastPlace firstPlaceDetails lastPlaceDetails vehicleAndFares currency')
      .lean()
      .exec();

    const destinationsMap = new Map<string, UniquePlaceDetail>();

    for (const route of connectedRoutes) {
      const isFirst =
        route.firstPlace &&
        (route.firstPlace.toLowerCase() === cleanOrigin.toLowerCase() ||
          route.firstPlace.toLowerCase().includes(cleanOrigin.toLowerCase()));
      const isLast =
        route.lastPlace &&
        (route.lastPlace.toLowerCase() === cleanOrigin.toLowerCase() ||
          route.lastPlace.toLowerCase().includes(cleanOrigin.toLowerCase()));

      // If origin matches firstPlace, destination is lastPlace
      if (isFirst && route.lastPlace) {
        const destName = route.lastPlace.trim();
        const lower = destName.toLowerCase();
        if (lower !== cleanOrigin.toLowerCase() && !destinationsMap.has(lower)) {
          destinationsMap.set(lower, {
            name: destName,
            address: route.lastPlaceDetails?.address || '',
            lat: route.lastPlaceDetails?.lat,
            lng: route.lastPlaceDetails?.lng,
            code: route.lastPlaceDetails?.code || '',
          });
        }
      }

      // If origin matches lastPlace, destination is firstPlace (bidirectional)
      if (isLast && route.firstPlace) {
        const destName = route.firstPlace.trim();
        const lower = destName.toLowerCase();
        if (lower !== cleanOrigin.toLowerCase() && !destinationsMap.has(lower)) {
          destinationsMap.set(lower, {
            name: destName,
            address: route.firstPlaceDetails?.address || '',
            lat: route.firstPlaceDetails?.lat,
            lng: route.firstPlaceDetails?.lng,
            code: route.firstPlaceDetails?.code || '',
          });
        }
      }
    }

    return Array.from(destinationsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
  }

  // Retrieves routes with optional search, firstPlace, lastPlace, active status, and pagination.
  async findAll(query?: QueryRouteDto) {
    const filter: Record<string, any> = {};

    if (query?.isActive !== undefined && query.isActive !== '') {
      filter.isActive = query.isActive === 'true';
    }

    if (query?.search) {
      const searchRegex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { firstPlace: searchRegex },
        { lastPlace: searchRegex },
        { notes: searchRegex },
      ];
    } else {
      if (query?.firstPlace) {
        filter.firstPlace = new RegExp(escapeRegex(query.firstPlace.trim()), 'i');
      }
      if (query?.lastPlace) {
        filter.lastPlace = new RegExp(escapeRegex(query.lastPlace.trim()), 'i');
      }
    }

    if (query?.vehicleType) {
      filter.$or = [
        { vehicleType: query.vehicleType },
        { vehicleType: 'all' },
      ];
    }

    const limit = query?.limit ? Math.max(1, parseInt(query.limit, 10)) : 50;
    const skip = query?.skip ? Math.max(0, parseInt(query.skip, 10)) : 0;

    const [routes, total] = await Promise.all([
      this.routeModel
        .find(filter)
        .sort({ firstPlace: 1, lastPlace: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.routeModel.countDocuments(filter).exec(),
    ]);

    return {
      routes,
      places: routes,
      total,
      limit,
      skip,
    };
  }

  // Looks up route fare by firstPlace and lastPlace (case-insensitive, bidirectional & fuzzy fallback)
  async findByRoute(firstPlace?: string, lastPlace?: string): Promise<RouteDocument> {
    if (!firstPlace || !lastPlace) {
      throw new BadRequestException(
        'Both pickup and destination locations are required (e.g. ?firstPlace=...&lastPlace=... or ?from=...&to=...)',
      );
    }

    const originClean = firstPlace.trim();
    const destClean = lastPlace.trim();
    const originEscaped = escapeRegex(originClean);
    const destEscaped = escapeRegex(destClean);

    // 1. Exact match (forward: firstPlace -> lastPlace)
    let route = await this.routeModel
      .findOne({
        firstPlace: new RegExp(`^${originEscaped}$`, 'i'),
        lastPlace: new RegExp(`^${destEscaped}$`, 'i'),
        isActive: true,
      })
      .exec();

    // 2. Reverse exact match (reverse: lastPlace -> firstPlace)
    if (!route) {
      route = await this.routeModel
        .findOne({
          firstPlace: new RegExp(`^${destEscaped}$`, 'i'),
          lastPlace: new RegExp(`^${originEscaped}$`, 'i'),
          isActive: true,
        })
        .exec();
    }

    // 3. Substring match fallback (forward)
    if (!route) {
      route = await this.routeModel
        .findOne({
          firstPlace: new RegExp(originEscaped, 'i'),
          lastPlace: new RegExp(destEscaped, 'i'),
          isActive: true,
        })
        .exec();
    }

    // 4. Substring match fallback (reverse)
    if (!route) {
      route = await this.routeModel
        .findOne({
          firstPlace: new RegExp(destEscaped, 'i'),
          lastPlace: new RegExp(originEscaped, 'i'),
          isActive: true,
        })
        .exec();
    }

    if (!route) {
      const totalCount = await this.routeModel.countDocuments().exec();
      if (totalCount === 0) {
        throw new NotFoundException(
          'No routes found in the database. Please seed default routes first via POST /api/v1/routes/seed or create a route via POST /api/v1/routes',
        );
      }

      throw new NotFoundException(
        `Fare route between '${firstPlace}' and '${lastPlace}' not found. Please check location names or use GET /api/v1/routes to view available routes.`,
      );
    }

    return route;
  }

  // Retrieves a single route fare by MongoDB ObjectId.
  async findById(id: string): Promise<RouteDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid route ID format: ${id}`);
    }

    const route = await this.routeModel.findById(id).exec();
    if (!route) {
      throw new NotFoundException(`Route with ID '${id}' not found`);
    }

    return route;
  }

  // Creates and stores a new route fare.
  async create(dto: CreateRouteDto): Promise<Route> {
    const firstPlaceClean = dto.firstPlace.trim();
    const lastPlaceClean = dto.lastPlace.trim();

    // Check if route between firstPlace and lastPlace already exists (case-insensitive)
    const existing = await this.routeModel.findOne({
      firstPlace: new RegExp(`^${escapeRegex(firstPlaceClean)}$`, 'i'),
      lastPlace: new RegExp(`^${escapeRegex(lastPlaceClean)}$`, 'i'),
    }).exec();

    if (existing) {
      throw new ConflictException(
        `Route between '${firstPlaceClean}' and '${lastPlaceClean}' already exists`,
      );
    }

    let vehicleAndFares = dto.vehicleAndFares || dto.vehicleFares || {};
    if (Object.keys(vehicleAndFares).length === 0) {
      const fallbackFare = dto.fair ?? dto.fare;
      if (fallbackFare !== undefined && !isNaN(Number(fallbackFare))) {
        vehicleAndFares = { taxi: Number(fallbackFare) };
      }
    }

    if (Object.keys(vehicleAndFares).length === 0) {
      throw new BadRequestException(
        'vehicleAndFares must contain at least 1 vehicle fare mapping (e.g. { taxi: 75 })',
      );
    }

    // Process increaseFarePerPerson (can be Record<string, number> or number)
    let increaseFarePerPersonMap: Record<string, number> = {};
    const rawPerPerson = dto.increaseFarePerPerson ?? dto.increaseFairPerPerson;
    if (typeof rawPerPerson === 'number') {
      for (const vKey of Object.keys(vehicleAndFares)) {
        increaseFarePerPersonMap[vKey] = Number(rawPerPerson);
      }
    } else if (rawPerPerson && typeof rawPerPerson === 'object') {
      increaseFarePerPersonMap = rawPerPerson;
    }

    const payload: Partial<Route> = Object.assign({}, dto, {
      firstPlace: firstPlaceClean,
      lastPlace: lastPlaceClean,
      vehicleAndFares,
      increaseFarePerPerson: increaseFarePerPersonMap,
      currency: (dto.currency ?? 'AUD').trim().toUpperCase(),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const created = new this.routeModel(payload);
    return created.save();
  }

  // Updates an existing route fare by ID.
  async update(id: string, dto: UpdateRouteDto): Promise<Route> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid route ID format: ${id}`);
    }

    const updateData: Record<string, any> = Object.assign({}, dto);

    if (dto.firstPlace) {
      updateData.firstPlace = dto.firstPlace.trim();
    }
    if (dto.lastPlace) {
      updateData.lastPlace = dto.lastPlace.trim();
    }

    if (dto.vehicleAndFares || dto.vehicleFares) {
      updateData.vehicleAndFares = dto.vehicleAndFares || dto.vehicleFares;
    }

    const rawPerPerson = dto.increaseFarePerPerson ?? dto.increaseFairPerPerson;
    if (typeof rawPerPerson === 'number') {
      const vFares = updateData.vehicleAndFares || {};
      const map: Record<string, number> = {};
      for (const k of Object.keys(vFares)) {
        map[k] = Number(rawPerPerson);
      }
      updateData.increaseFarePerPerson = map;
    } else if (rawPerPerson && typeof rawPerPerson === 'object') {
      updateData.increaseFarePerPerson = rawPerPerson;
    }

    if (dto.currency) {
      updateData.currency = dto.currency.trim().toUpperCase();
    }

    const updated = await this.routeModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Route with ID '${id}' not found`);
    }

    return updated;
  }

  // Deletes a route fare by ID.
  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid route ID format: ${id}`);
    }

    const deleted = await this.routeModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Route with ID '${id}' not found`);
    }

    return {
      success: true,
      message: `Route with ID '${id}' deleted successfully`,
    };
  }

  // Seeds default Sydney transfer routes and fares.
  async seedDefaultPlaces() {
    const defaultRoutes = [
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Sydney CBD',
        increaseFarePerPerson: { taxi: 10, executive: 10, luxury: 15, suv: 12, mpv: 12, van: 15 },
        currency: 'AUD',
        distanceKm: 14,
        durationMin: 25,
        vehicleAndFares: {
          taxi: 65,
          executive: 85,
          luxury: 110,
          suv: 95,
          mpv: 105,
          van: 125,
        },
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093, code: 'CBD' },
        isActive: true,
        notes: 'Popular airport to downtown transfer route',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Bondi Beach',
        increaseFarePerPerson: { taxi: 10, executive: 10, luxury: 15, suv: 12, mpv: 12, van: 15 },
        currency: 'AUD',
        distanceKm: 16,
        durationMin: 30,
        vehicleAndFares: {
          taxi: 75,
          executive: 95,
          luxury: 125,
          suv: 105,
          mpv: 115,
          van: 135,
        },
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Bondi Beach NSW 2026', lat: -33.8915, lng: 151.2767 },
        isActive: true,
        notes: 'Eastern suburbs coastal route',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Parramatta',
        increaseFarePerPerson: { taxi: 15, executive: 15, luxury: 20, suv: 18, mpv: 18, van: 20 },
        currency: 'AUD',
        distanceKm: 28,
        durationMin: 40,
        vehicleAndFares: {
          taxi: 95,
          executive: 120,
          luxury: 155,
          suv: 135,
          mpv: 145,
          van: 170,
        },
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Parramatta NSW 2150', lat: -33.815, lng: 151.0011 },
        isActive: true,
        notes: 'Western Sydney business hub',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Manly',
        increaseFarePerPerson: { taxi: 15, executive: 15, luxury: 20, suv: 18, mpv: 18, van: 20 },
        currency: 'AUD',
        distanceKm: 27,
        durationMin: 45,
        vehicleAndFares: {
          taxi: 110,
          executive: 140,
          luxury: 175,
          suv: 150,
          mpv: 165,
          van: 190,
        },
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Manly NSW 2095', lat: -33.7971, lng: 151.2882 },
        isActive: true,
        notes: 'Northern Beaches transfer',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Chatswood',
        increaseFarePerPerson: { taxi: 12, executive: 12, luxury: 18, suv: 15, mpv: 15, van: 18 },
        currency: 'AUD',
        distanceKm: 22,
        durationMin: 35,
        vehicleAndFares: {
          taxi: 85,
          executive: 110,
          luxury: 145,
          suv: 120,
          mpv: 135,
          van: 155,
        },
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Chatswood NSW 2067', lat: -33.7961, lng: 151.178 },
        isActive: true,
        notes: 'North Shore commercial center',
      },
      {
        firstPlace: 'Sydney CBD',
        lastPlace: 'Bondi Beach',
        increaseFarePerPerson: { taxi: 8, executive: 8, luxury: 12, suv: 10, mpv: 10, van: 12 },
        currency: 'AUD',
        distanceKm: 8,
        durationMin: 20,
        vehicleAndFares: {
          taxi: 35,
          executive: 50,
          luxury: 70,
          suv: 60,
          mpv: 65,
          van: 85,
        },
        firstPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093 },
        lastPlaceDetails: { address: 'Bondi Beach NSW 2026', lat: -33.8915, lng: 151.2767 },
        isActive: true,
        notes: 'Inner city to beach transfer',
      },
      {
        firstPlace: 'Sydney CBD',
        lastPlace: 'Manly Beach',
        increaseFarePerPerson: { taxi: 10, executive: 10, luxury: 15, suv: 12, mpv: 12, van: 15 },
        currency: 'AUD',
        distanceKm: 15,
        durationMin: 30,
        vehicleAndFares: {
          taxi: 55,
          executive: 75,
          luxury: 100,
          suv: 85,
          mpv: 95,
          van: 115,
        },
        firstPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093 },
        lastPlaceDetails: { address: 'Manly NSW 2095', lat: -33.7971, lng: 151.2882 },
        isActive: true,
        notes: 'CBD to Northern Beaches',
      },
    ];

    const results = [];
    for (const route of defaultRoutes) {
      const updated = await this.routeModel.findOneAndUpdate(
        {
          firstPlace: route.firstPlace,
          lastPlace: route.lastPlace,
        },
        { $set: route },
        { upsert: true, returnDocument: 'after' },
      );
      results.push(updated);
    }

    return {
      success: true,
      message: `Successfully seeded ${results.length} default route fares`,
      count: results.length,
      routes: results,
      places: results,
    };
  }
}
