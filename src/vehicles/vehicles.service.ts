import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vehicle, VehicleDocument } from './schemas/vehicle.schema.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

// Service managing database operations, queries, and seeding for vehicle fleet records.
@Injectable()
export class VehiclesService {
  // Injects Mongoose Model for Vehicle entity.
  constructor(
    @InjectModel(Vehicle.name)
    private readonly vehicleModel: Model<VehicleDocument>,
  ) {}

  // Retrieves vehicles from MongoDB matching optional service category, passenger capacity, and active status.
  async findAll(query?: {
    service?: string;
    pax?: number;
    isActive?: boolean;
  }): Promise<Vehicle[]> {
    const filter: Record<string, any> = {};

    if (query?.isActive !== undefined) {
      filter.isActive = query.isActive;
    } else {
      filter.isActive = true;
    }

    if (query?.service) {
      filter.supportedServices = query.service;
    }

    if (query?.pax) {
      filter.passengersMax = { $gte: Number(query.pax) };
    }

    return this.vehicleModel.find(filter).sort({ sortOrder: 1, basePrice: 1 }).exec();
  }

  // Finds a single vehicle by its unique slug, throwing NotFoundException if absent.
  async findBySlug(slug: string): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findOne({ slug: slug.toLowerCase() }).exec();
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with slug '${slug}' not found`);
    }
    return vehicle;
  }

  // Finds a single vehicle by MongoDB ObjectId, throwing NotFoundException if absent.
  async findById(id: string): Promise<VehicleDocument> {
    const vehicle = await this.vehicleModel.findById(id).exec();
    if (!vehicle) {
      throw new NotFoundException(`Vehicle with ID '${id}' not found`);
    }
    return vehicle;
  }

  // Creates and persists a new vehicle document with a normalized lowercase slug.
  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const payload = Object.assign({}, dto, {
      slug: dto.slug.toLowerCase(),
    });
    const created = new this.vehicleModel(payload);
    return created.save();
  }

  // Updates an existing vehicle record by ID and returns the updated document.
  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const updateData: Record<string, any> = Object.assign({}, dto);
    if (dto.slug) {
      updateData.slug = dto.slug.toLowerCase();
    }
    const updated = await this.vehicleModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Vehicle with ID '${id}' not found`);
    }
    return updated;
  }

  // Deletes a vehicle document from MongoDB by ID.
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const deleted = await this.vehicleModel.findByIdAndDelete(id).exec();
    if (!deleted) {
      throw new NotFoundException(`Vehicle with ID '${id}' not found`);
    }
    return { success: true, message: `Vehicle ${id} deleted successfully` };
  }

  // Upserts predefined fleet specifications (Taxi, Executive, Luxury, SUV, MPV, Van) into MongoDB.
  async seedDefaultVehicles(): Promise<{ count: number; vehicles: Vehicle[] }> {
    const defaults = [
      {
        slug: 'taxi',
        name: 'Taxi',
        group: 'Sedan',
        description: 'Everyday affordable rides across Sydney with meter/fixed rates.',
        supportedServices: ['taxi'],
        passengersMin: 1,
        passengersMax: 4,
        luggage: 2,
        features: ['GPS Metering', 'EFTPOS Available', 'Fast Local Dispatch'],
        exampleModels: ['Toyota Camry Hybrid', 'Toyota Corolla'],
        image: '/fleet/taxi.png',
        basePrice: 4500, // $45.00
        pricePerKm: 250,  // $2.50/km
        pricePerMinute: 80,
        minimumFare: 3000,
        isActive: true,
        sortOrder: 1,
      },
      {
        slug: 'executive',
        name: 'Executive Sedan',
        group: 'Sedan',
        description: 'Business and airport transportation in refined premium sedans.',
        supportedServices: ['airport', 'chauffeur'],
        passengersMin: 1,
        passengersMax: 4,
        luggage: 3,
        features: ['Leather Seating', 'Bottled Water', 'Flight Tracking', 'Phone Chargers'],
        exampleModels: ['Mercedes-Benz E-Class', 'BMW 5 Series', 'Audi A6'],
        image: '/fleet/sedan.png',
        basePrice: 8500, // $85.00
        pricePerKm: 320,  // $3.20/km
        pricePerMinute: 110,
        minimumFare: 7500,
        isActive: true,
        sortOrder: 2,
      },
      {
        slug: 'luxury',
        name: 'Luxury Chauffeur',
        group: 'Luxury Sedan',
        description: 'First-class travel and VIP hospitality in flagship luxury long-wheelbase sedans.',
        supportedServices: ['airport', 'chauffeur'],
        passengersMin: 1,
        passengersMax: 3,
        luggage: 3,
        features: ['Executive Reclining Seats', 'Quiet Cabin', 'Uniformed Chauffeur', 'Flight Tracking'],
        exampleModels: ['Mercedes-Benz S-Class', 'BMW 7 Series', 'Audi A8'],
        image: '/fleet/luxury.png',
        basePrice: 14000, // $140.00
        pricePerKm: 450,   // $4.50/km
        pricePerMinute: 150,
        minimumFare: 12000,
        isActive: true,
        sortOrder: 3,
      },
      {
        slug: 'suv',
        name: 'Premium SUV',
        group: 'SUV',
        description: 'Spacious and commanding luxury SUVs for families and extra luggage.',
        supportedServices: ['taxi', 'airport', 'chauffeur'],
        passengersMin: 1,
        passengersMax: 6,
        luggage: 5,
        features: ['All-Wheel Drive', 'Panoramic Sunroof', 'Extra Luggage Capacity', 'Child Seat Friendly'],
        exampleModels: ['Audi Q7', 'Mercedes-Benz GLE', 'BMW X5'],
        image: '/fleet/suv.png',
        basePrice: 11000, // $110.00
        pricePerKm: 380,   // $3.80/km
        pricePerMinute: 125,
        minimumFare: 9000,
        isActive: true,
        sortOrder: 4,
      },
      {
        slug: 'mpv',
        name: 'Luxury People Mover (MPV)',
        group: 'MPV',
        description: 'Premium multi-passenger comfort with conference seating and generous luggage room.',
        supportedServices: ['airport', 'chauffeur'],
        passengersMin: 1,
        passengersMax: 7,
        luggage: 6,
        features: ['Conference Seating', 'Individual Climate Zones', 'Dual Sliding Doors'],
        exampleModels: ['Mercedes-Benz V-Class', 'Kia Carnival Platinum'],
        image: '/fleet/mpv.png',
        basePrice: 13000, // $130.00
        pricePerKm: 420,   // $4.20/km
        pricePerMinute: 140,
        minimumFare: 11000,
        isActive: true,
        sortOrder: 5,
      },
      {
        slug: 'van',
        name: 'Minibus / Executive Van',
        group: 'Van',
        description: 'High capacity group transport for corporate delegations, wedding parties, and airport teams.',
        supportedServices: ['airport', 'chauffeur'],
        passengersMin: 8,
        passengersMax: 14,
        luggage: 14,
        features: ['High Roof Standing Room', 'Massive Luggage Capacity', 'PA System', 'Individual AC Vents'],
        exampleModels: ['Mercedes-Benz Sprinter Executive', 'Renault Master'],
        image: '/fleet/van.png',
        basePrice: 18000, // $180.00
        pricePerKm: 520,   // $5.20/km
        pricePerMinute: 180,
        minimumFare: 16000,
        isActive: true,
        sortOrder: 6,
      },
    ];

    for (const item of defaults) {
      await this.vehicleModel.updateOne(
        { slug: item.slug },
        { $set: item },
        { upsert: true },
      );
    }

    const all = await this.vehicleModel.find().sort({ sortOrder: 1 }).exec();
    return { count: all.length, vehicles: all };
  }
}
