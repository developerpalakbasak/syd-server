import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema.js';
import { CreatePlaceDto } from './dto/create-place.dto.js';
import { UpdatePlaceDto } from './dto/update-place.dto.js';
import { QueryPlaceDto } from './dto/query-place.dto.js';

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

// Service managing admin place route fares, lookups, and seeding.
@Injectable()
export class PlacesService {
  // Injects Mongoose Model for Place collection.
  constructor(
    @InjectModel(Place.name)
    private readonly placeModel: Model<PlaceDocument>,
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
      this.placeModel.distinct('firstPlace', filter).exec(),
      this.placeModel.distinct('lastPlace', filter).exec(),
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

    const routes = await this.placeModel
      .find(filter)
      .select('firstPlace lastPlace firstPlaceDetails lastPlaceDetails')
      .lean()
      .exec();

    const uniqueMap = new Map<string, UniquePlaceDetail>();

    for (const route of routes as any[]) {
      if (route.firstPlace && typeof route.firstPlace === 'string') {
        const trimmed = route.firstPlace.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          const existing = uniqueMap.get(lower);
          const details = route.firstPlaceDetails;
          if (!existing) {
            uniqueMap.set(lower, {
              name: trimmed,
              address: details?.address || '',
              lat: details?.lat,
              lng: details?.lng,
              code: details?.code || '',
            });
          } else if (details && (!existing.address || !existing.lat || !existing.code)) {
            if (!existing.address && details.address) existing.address = details.address;
            if (existing.lat === undefined && details.lat !== undefined) existing.lat = details.lat;
            if (existing.lng === undefined && details.lng !== undefined) existing.lng = details.lng;
            if (!existing.code && details.code) existing.code = details.code;
          }
        }
      }

      if (route.lastPlace && typeof route.lastPlace === 'string') {
        const trimmed = route.lastPlace.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          const existing = uniqueMap.get(lower);
          const details = route.lastPlaceDetails;
          if (!existing) {
            uniqueMap.set(lower, {
              name: trimmed,
              address: details?.address || '',
              lat: details?.lat,
              lng: details?.lng,
              code: details?.code || '',
            });
          } else if (details && (!existing.address || !existing.lat || !existing.code)) {
            if (!existing.address && details.address) existing.address = details.address;
            if (existing.lat === undefined && details.lat !== undefined) existing.lat = details.lat;
            if (existing.lng === undefined && details.lng !== undefined) existing.lng = details.lng;
            if (!existing.code && details.code) existing.code = details.code;
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
          (p.address && p.address.toLowerCase().includes(searchLower)) ||
          (p.code && p.code.toLowerCase().includes(searchLower)),
      );
    }

    return places;
  }

  // Retrieves places with optional search, firstPlace, lastPlace, active status, and pagination.
  async findAll(query?: QueryPlaceDto) {
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

    const [places, total] = await Promise.all([
      this.placeModel
        .find(filter)
        .sort({ firstPlace: 1, lastPlace: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.placeModel.countDocuments(filter).exec(),
    ]);

    return {
      places,
      total,
      limit,
      skip,
    };
  }

  // Looks up route fare by firstPlace and lastPlace (case-insensitive, bidirectional & fuzzy fallback)
  async findByRoute(firstPlace?: string, lastPlace?: string): Promise<PlaceDocument> {
    if (!firstPlace || !lastPlace) {
      throw new BadRequestException(
        'Both pickup and destination locations are required (e.g. ?firstPlace=...&lastPlace=... or ?from=...&to=...)',
      );
    }

    const originClean = firstPlace.trim();
    const destClean = lastPlace.trim();
    const originEscaped = escapeRegex(originClean);
    const destEscaped = escapeRegex(destClean);

    // 1. Exact match (case-insensitive, escaped regex)
    let route = await this.placeModel
      .findOne({
        firstPlace: new RegExp(`^${originEscaped}$`, 'i'),
        lastPlace: new RegExp(`^${destEscaped}$`, 'i'),
        isActive: true,
      })
      .exec();

    // 2. Reverse direction exact match
    if (!route) {
      route = await this.placeModel
        .findOne({
          firstPlace: new RegExp(`^${destEscaped}$`, 'i'),
          lastPlace: new RegExp(`^${originEscaped}$`, 'i'),
          isActive: true,
        })
        .exec();
    }

    // 3. Partial substring match (e.g. "Sydney Airport" matching "Sydney Airport (SYD)")
    if (!route) {
      route = await this.placeModel
        .findOne({
          firstPlace: new RegExp(originEscaped, 'i'),
          lastPlace: new RegExp(destEscaped, 'i'),
          isActive: true,
        })
        .exec();
    }

    // 4. Reverse partial substring match
    if (!route) {
      route = await this.placeModel
        .findOne({
          firstPlace: new RegExp(destEscaped, 'i'),
          lastPlace: new RegExp(originEscaped, 'i'),
          isActive: true,
        })
        .exec();
    }

    if (!route) {
      const totalCount = await this.placeModel.countDocuments().exec();
      if (totalCount === 0) {
        throw new NotFoundException(
          'No routes found in the database. Please seed default routes first via POST /api/v1/places/seed or create a route via POST /api/v1/places',
        );
      }

      throw new NotFoundException(
        `Fare route between '${firstPlace}' and '${lastPlace}' not found. Please check location names or use GET /api/v1/places to view available routes.`,
      );
    }

    return route;
  }

  // Retrieves a single place route fare by MongoDB ObjectId.
  async findById(id: string): Promise<PlaceDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid place route ID format: ${id}`);
    }

    const place = await this.placeModel.findById(id).exec();
    if (!place) {
      throw new NotFoundException(`Place route with ID '${id}' not found`);
    }

    return place;
  }

  // Creates and stores a new place route fare.
  async create(dto: CreatePlaceDto): Promise<Place> {
    const fairAmount = dto.fair ?? dto.fare;
    if (fairAmount === undefined || isNaN(Number(fairAmount))) {
      throw new BadRequestException('Fair (fare) amount is required and must be a number');
    }

    const payload: Partial<Place> = Object.assign({}, dto, {
      firstPlace: dto.firstPlace.trim(),
      lastPlace: dto.lastPlace.trim(),
      fair: Number(fairAmount),
      fare: Number(fairAmount),
      currency: (dto.currency ?? 'AUD').trim().toUpperCase(),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    const created = new this.placeModel(payload);
    return created.save();
  }

  // Updates an existing place route fare by ID.
  async update(id: string, dto: UpdatePlaceDto): Promise<Place> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid place route ID format: ${id}`);
    }

    const updateData: Record<string, any> = Object.assign({}, dto);

    if (dto.firstPlace) {
      updateData.firstPlace = dto.firstPlace.trim();
    }
    if (dto.lastPlace) {
      updateData.lastPlace = dto.lastPlace.trim();
    }

    const fairAmount = dto.fair ?? dto.fare;
    if (fairAmount !== undefined) {
      updateData.fair = Number(fairAmount);
      updateData.fare = Number(fairAmount);
    }

    if (dto.currency) {
      updateData.currency = dto.currency.trim().toUpperCase();
    }

    const updated = await this.placeModel
      .findByIdAndUpdate(id, updateData, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Place route with ID '${id}' not found`);
    }

    return updated;
  }

  // Deletes a place route fare by ID.
  async remove(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException(`Invalid place route ID format: ${id}`);
    }

    const deleted = await this.placeModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Place route with ID '${id}' not found`);
    }

    return {
      success: true,
      message: `Place route with ID '${id}' deleted successfully`,
    };
  }

  // Seeds default Sydney transfer routes and fares.
  async seedDefaultPlaces() {
    const defaultRoutes = [
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Sydney CBD',
        fair: 65,
        fare: 65,
        currency: 'AUD',
        distanceKm: 14,
        durationMin: 25,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093, code: 'CBD' },
        isActive: true,
        notes: 'Popular airport to downtown transfer route',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Bondi Beach',
        fair: 75,
        fare: 75,
        currency: 'AUD',
        distanceKm: 16,
        durationMin: 30,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Bondi Beach NSW 2026', lat: -33.8915, lng: 151.2767 },
        isActive: true,
        notes: 'Eastern suburbs coastal route',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Parramatta',
        fair: 95,
        fare: 95,
        currency: 'AUD',
        distanceKm: 28,
        durationMin: 40,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Parramatta NSW 2150', lat: -33.815, lng: 151.0011 },
        isActive: true,
        notes: 'Western Sydney business hub',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Manly',
        fair: 110,
        fare: 110,
        currency: 'AUD',
        distanceKm: 27,
        durationMin: 45,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Manly NSW 2095', lat: -33.7971, lng: 151.2882 },
        isActive: true,
        notes: 'Northern Beaches transfer',
      },
      {
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Chatswood',
        fair: 85,
        fare: 85,
        currency: 'AUD',
        distanceKm: 22,
        durationMin: 35,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Mascot NSW 2020', lat: -33.9399, lng: 151.1753, code: 'SYD' },
        lastPlaceDetails: { address: 'Chatswood NSW 2067', lat: -33.7961, lng: 151.178 },
        isActive: true,
        notes: 'North Shore commercial center',
      },
      {
        firstPlace: 'Sydney CBD',
        lastPlace: 'Bondi Beach',
        fair: 35,
        fare: 35,
        currency: 'AUD',
        distanceKm: 8,
        durationMin: 20,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093 },
        lastPlaceDetails: { address: 'Bondi Beach NSW 2026', lat: -33.8915, lng: 151.2767 },
        isActive: true,
        notes: 'Inner city to beach transfer',
      },
      {
        firstPlace: 'Sydney CBD',
        lastPlace: 'Manly Beach',
        fair: 55,
        fare: 55,
        currency: 'AUD',
        distanceKm: 15,
        durationMin: 30,
        vehicleType: 'all',
        firstPlaceDetails: { address: 'Sydney NSW 2000', lat: -33.8688, lng: 151.2093 },
        lastPlaceDetails: { address: 'Manly NSW 2095', lat: -33.7971, lng: 151.2882 },
        isActive: true,
        notes: 'CBD to Northern Beaches',
      },
    ];

    const results = [];
    for (const route of defaultRoutes) {
      const updated = await this.placeModel.findOneAndUpdate(
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
      message: `Successfully seeded ${results.length} default place route fares`,
      count: results.length,
      places: results,
    };
  }
}
