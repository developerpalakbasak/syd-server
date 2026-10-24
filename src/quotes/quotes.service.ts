import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import jwt from 'jsonwebtoken';
import { Vehicle, VehicleDocument } from '../vehicles/schemas/vehicle.schema.js';
import { Route, RouteDocument } from '../routes/schemas/route.schema.js';
import { GetQuotesDto, PlaceLocationDto } from './dto/get-quotes.dto.js';

export interface QuotePriceSnapshot {
  currency: string;
  lines: { label: string; amount: number }[];
  total: number;
  gstIncluded: number;
  distanceKm: number;
  durationMin: number;
}

export interface QuoteOptionResponse {
  category: {
    slug: string;
    name: string;
    description?: string;
    group?: string;
    passengersMin?: number;
    passengersMax: number;
    luggage: number;
    features?: string[];
    exampleModels?: string[];
    image?: string;
    priceFrom?: number | null;
  };
  price: QuotePriceSnapshot;
  etaMin: number | null;
  quoteToken: string;
}

export interface QuoteTokenPayload {
  service: string;
  pickup: PlaceLocationDto;
  destination?: PlaceLocationDto;
  passengers: number;
  pickupAt?: string;
  vehicleType: string;
  price: QuotePriceSnapshot;
}

@Injectable()
export class QuotesService {
  private readonly jwtSecret: string;

  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
    @InjectModel(Route.name)
    private readonly routeModel: Model<RouteDocument>,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'quotes_secret_fallback_key';
  }

  // Calculate distance between two lat/lng coordinates in kilometers using Haversine formula
  private calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.max(1, Math.round(distance * 10) / 10);
  }

  // Find pre-configured route in DB matching pickup and destination
  private async findMatchingRoute(
    pickup: PlaceLocationDto,
    destination?: PlaceLocationDto,
  ): Promise<RouteDocument | null> {
    if (!destination) return null;

    const pName = (pickup.name || '').trim();
    const dName = (destination.name || '').trim();
    if (!pName || !dName) return null;

    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pRegex = new RegExp(escape(pName), 'i');
    const dRegex = new RegExp(escape(dName), 'i');

    return this.routeModel
      .findOne({
        isActive: true,
        $or: [
          { firstPlace: pRegex, lastPlace: dRegex },
          { firstPlace: dRegex, lastPlace: pRegex },
        ],
      })
      .exec();
  }

  async calculateQuotes(dto: GetQuotesDto): Promise<{ options: QuoteOptionResponse[] }> {
    const service = dto.service || 'airport';
    const passengers = Math.max(1, dto.passengers || 1);
    const pickup = dto.pickup;
    const destination = dto.destination;

    if (!pickup || typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number') {
      throw new BadRequestException('Valid pickup location with coordinates is required');
    }

    if (service !== 'chauffeur' && (!destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number')) {
      throw new BadRequestException('Valid destination with coordinates is required');
    }

    // Check for predefined fixed route
    const matchingRoute = destination ? await this.findMatchingRoute(pickup, destination) : null;

    // Calculate distance and estimated travel duration
    let distanceKm = 10;
    let durationMin = 20;

    if (matchingRoute?.distanceKm && matchingRoute.distanceKm > 0) {
      distanceKm = matchingRoute.distanceKm;
      durationMin = matchingRoute.durationMin || Math.round(distanceKm * 1.8 + 5);
    } else if (destination) {
      const straightLineKm = this.calculateHaversineDistanceKm(
        pickup.lat,
        pickup.lng,
        destination.lat,
        destination.lng,
      );
      // Realistic road distance ~ 1.35x straight line in city/suburban Sydney
      distanceKm = Math.max(2, Math.round(straightLineKm * 1.35));
      // Average 35-40 km/h in Sydney traffic + 5 min buffer
      durationMin = Math.max(10, Math.round((distanceKm / 35) * 60 + 5));
    }

    // Get active vehicles eligible for this service and passenger count
    const filter: Record<string, any> = { isActive: true };
    if (service) {
      filter.supportedServices = service;
    }
    filter.passengersMax = { $gte: passengers };

    let vehicles = await this.vehicleModel
      .find(filter)
      .sort({ sortOrder: 1, basePrice: 1 })
      .exec();

    // Fallback if no vehicle filtered by supportedServices
    if (!vehicles || vehicles.length === 0) {
      vehicles = await this.vehicleModel
        .find({ isActive: true, passengersMax: { $gte: passengers } })
        .sort({ sortOrder: 1, basePrice: 1 })
        .exec();
    }

    const options: QuoteOptionResponse[] = [];

    for (const vehicle of vehicles) {
      const vSlug = vehicle.slug.toLowerCase();
      let totalCents = 0;
      const lines: { label: string; amount: number }[] = [];

      // Check if predefined route has a fixed fare for this vehicle
      const fixedFareMap = matchingRoute?.vehicleAndFares;
      const fixedFareAud =
        fixedFareMap instanceof Map
          ? fixedFareMap.get(vSlug)
          : (fixedFareMap as Record<string, number>)?.[vSlug];

      if (typeof fixedFareAud === 'number' && fixedFareAud > 0) {
        // Predefined route fare in AUD -> convert to cents
        const baseRouteFareCents = Math.round(fixedFareAud * 100);
        lines.push({ label: 'Base fixed fare', amount: baseRouteFareCents });
        totalCents += baseRouteFareCents;

        // Additional passenger fare if passengers > 1
        if (passengers > 1 && matchingRoute?.increaseFarePerPerson) {
          const incMap = matchingRoute.increaseFarePerPerson;
          const incAud =
            incMap instanceof Map
              ? incMap.get(vSlug)
              : (incMap as Record<string, number>)?.[vSlug];
          if (typeof incAud === 'number' && incAud > 0) {
            const extraPaxCents = Math.round((passengers - 1) * incAud * 100);
            lines.push({
              label: `Additional passenger fee (${passengers - 1} pax)`,
              amount: extraPaxCents,
            });
            totalCents += extraPaxCents;
          }
        }
      } else {
        // Dynamic distance & vehicle rate calculation (all vehicle price fields are in cents)
        const baseRateCents = vehicle.basePrice || 4500;
        lines.push({ label: 'Base booking fee', amount: baseRateCents });
        totalCents += baseRateCents;

        const distanceRateCents = vehicle.pricePerKm || 250;
        const distanceTotalCents = Math.round(distanceKm * distanceRateCents);
        lines.push({
          label: `Distance charge (${distanceKm} km @ $${(distanceRateCents / 100).toFixed(2)}/km)`,
          amount: distanceTotalCents,
        });
        totalCents += distanceTotalCents;

        const timeRateCents = vehicle.pricePerMinute || 80;
        const timeTotalCents = Math.round(durationMin * timeRateCents);
        lines.push({
          label: `Estimated travel time (${durationMin} min)`,
          amount: timeTotalCents,
        });
        totalCents += timeTotalCents;

        // Apply vehicle minimum fare guarantee
        if (vehicle.minimumFare && totalCents < vehicle.minimumFare) {
          totalCents = vehicle.minimumFare;
        }
      }

      // 10% GST is included in Australian transport pricing
      const gstIncluded = Math.round(totalCents / 11);

      const priceSnapshot: QuotePriceSnapshot = {
        currency: 'AUD',
        lines,
        total: totalCents,
        gstIncluded,
        distanceKm,
        durationMin,
      };

      // Generate signed quoteToken payload valid for 2 hours
      const payload: QuoteTokenPayload = {
        service,
        pickup,
        destination,
        passengers,
        pickupAt: dto.pickupAt,
        vehicleType: vehicle.slug,
        price: priceSnapshot,
      };

      const quoteToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '2h' });

      options.push({
        category: {
          slug: vehicle.slug,
          name: vehicle.name,
          description: vehicle.description,
          group: vehicle.group,
          passengersMin: vehicle.passengersMin,
          passengersMax: vehicle.passengersMax,
          luggage: vehicle.luggage,
          features: vehicle.features,
          exampleModels: vehicle.exampleModels,
          image: vehicle.image,
          priceFrom: vehicle.basePrice,
        },
        price: priceSnapshot,
        etaMin: Math.max(5, Math.min(25, Math.round(Math.random() * 10 + 8))),
        quoteToken,
      });
    }

    return { options };
  }

  // Decodes and verifies quoteToken
  verifyQuoteToken(token: string): QuoteTokenPayload | null {
    try {
      return jwt.verify(token, this.jwtSecret) as QuoteTokenPayload;
    } catch {
      return null;
    }
  }
}
