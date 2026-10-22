import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import { Driver, DriverDocument, DriverStatus } from './schemas/driver.schema.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import { RegisterDriverDto, LoginDriverDto, UpdateDriverStatusDto } from './dto/driver.dto.js';
import { hashPassword, verifyPassword } from '../admin/admin.service.js';

import { Subject } from 'rxjs';

export interface DriverJwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'driver';
}

@Injectable()
export class DriversService {
  // Real-time broadcast channel for driver online/offline updates
  public readonly driverEvents$ = new Subject<{ event: string; data?: any }>();

  constructor(
    @InjectModel(Driver.name) private readonly driverModel: Model<DriverDocument>,
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret(): string {
    return (
      this.configService.get<string>('JWT_SECRET')?.split('#')[0].trim() ||
      'supersecretjwtkey_sydtransfer_2026'
    );
  }

  // Register a new driver application
  async register(dto: RegisterDriverDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.driverModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException(`Driver with email "${email}" already registered`);
    }

    const passwordHash = hashPassword(dto.password);

    const driver = new this.driverModel({
      name: dto.name.trim(),
      email,
      phone: dto.phone.trim(),
      passwordHash,
      status: DriverStatus.PENDING_VERIFICATION,
      isOnline: false,
      vehicle: {
        make: dto.make.trim(),
        model: dto.model.trim(),
        year: dto.year,
        regoPlate: dto.regoPlate.trim().toUpperCase(),
        color: dto.color.trim(),
        serviceType: dto.serviceType,
        passengerCapacity: dto.passengerCapacity || 4,
        luggageCapacity: dto.luggageCapacity || 3,
      },
      documents: {
        driverLicenseNumber: dto.driverLicenseNumber || '',
        pointToPointCardNumber: dto.pointToPointCardNumber || '',
        abnNumber: dto.abnNumber || '',
        insurancePolicyNumber: dto.insurancePolicyNumber || '',
      },
    });

    await driver.save();

    return {
      success: true,
      message: 'Registration submitted successfully. Pending administrator verification.',
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        status: driver.status,
      },
    };
  }

  // Driver Login
  async login(dto: LoginDriverDto) {
    const email = dto.email.trim().toLowerCase();
    const driver = await this.driverModel.findOne({ email }).select('+passwordHash').exec();

    if (!driver || !driver.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = verifyPassword(dto.password, driver.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (driver.status === DriverStatus.SUSPENDED) {
      throw new UnauthorizedException('Your driver account has been suspended. Please contact support.');
    }

    const payload: DriverJwtPayload = {
      sub: driver._id.toString(),
      email: driver.email,
      name: driver.name,
      role: 'driver',
    };

    const token = jwt.sign(payload, this.getJwtSecret(), { expiresIn: '7d' });

    return {
      success: true,
      message: 'Login successful',
      token,
      driver: {
        id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        isOnline: driver.isOnline,
        vehicle: driver.vehicle,
        rating: driver.rating,
        walletBalanceCents: driver.walletBalanceCents,
        totalTrips: driver.totalTrips,
      },
    };
  }

  // Get Profile
  async getProfile(driverId: string) {
    const driver = await this.driverModel.findById(driverId).exec();
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  // Toggle Online/Offline Status and GPS Location
  async updateStatus(driverId: string, dto: UpdateDriverStatusDto) {
    const driver = await this.driverModel.findById(driverId).exec();
    if (!driver) throw new NotFoundException('Driver not found');

    if (driver.status === DriverStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Account verification is pending. You cannot go online yet.');
    }
    if (driver.status === DriverStatus.SUSPENDED) {
      throw new BadRequestException('Account suspended.');
    }

    driver.isOnline = dto.isOnline;
    if (dto.lat !== undefined && dto.lng !== undefined) {
      driver.currentLocation = {
        lat: dto.lat,
        lng: dto.lng,
        updatedAt: new Date(),
      };
    }

    // Update operational status
    if (driver.status !== DriverStatus.ON_TRIP) {
      driver.status = dto.isOnline ? DriverStatus.ACTIVE : DriverStatus.OFFLINE;
    }

    await driver.save();

    // Trigger instant real-time event for passengers
    this.driverEvents$.next({
      event: 'driver_status_changed',
      data: {
        driverId: driver._id,
        isOnline: driver.isOnline,
        status: driver.status,
        serviceType: driver.vehicle?.serviceType,
      },
    });

    return {
      success: true,
      isOnline: driver.isOnline,
      status: driver.status,
      currentLocation: driver.currentLocation,
    };
  }

  // Get Assigned and Available Trips for Driver
  async getDriverTrips(driverId: string) {
    const driverObjectId = new Types.ObjectId(driverId);

    // Active assigned trips
    const currentTrips = await this.bookingModel
      .find({
        driver: driverObjectId,
        status: { $in: ['assigned', 'on_the_way', 'arrived', 'in_progress'] },
      })
      .sort({ createdAt: -1 })
      .exec();

    // Available unassigned trips (confirmed bookings without a driver)
    const availableJobs = await this.bookingModel
      .find({
        driver: { $exists: false },
        status: 'confirmed',
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .exec();

    // Completed / past history
    const pastTrips = await this.bookingModel
      .find({
        driver: driverObjectId,
        status: { $in: ['completed', 'cancelled'] },
      })
      .sort({ updatedAt: -1 })
      .limit(30)
      .exec();

    return {
      success: true,
      currentTrips,
      availableJobs,
      pastTrips,
    };
  }

  // Accept a trip
  async acceptTrip(driverId: string, bookingId: string) {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.driver && booking.driver.toString() !== driverId) {
      throw new BadRequestException('This trip has already been taken by another driver');
    }

    booking.driver = new Types.ObjectId(driverId);
    booking.status = 'assigned';
    await booking.save();

    await this.driverModel.findByIdAndUpdate(driverId, { status: DriverStatus.ON_TRIP }).exec();

    return {
      success: true,
      message: 'Trip accepted successfully',
      booking,
    };
  }

  // Update Trip Progress: 'on_the_way', 'arrived', 'in_progress', 'completed'
  async updateTripStatus(
    driverId: string,
    bookingId: string,
    newStatus: 'on_the_way' | 'arrived' | 'in_progress' | 'completed',
  ) {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) throw new NotFoundException('Booking not found');

    if (!booking.driver || booking.driver.toString() !== driverId) {
      throw new UnauthorizedException('You are not assigned to this trip');
    }

    booking.status = newStatus;
    if (newStatus === 'completed') {
      booking.paymentStatus = 'paid';
      const fareAmount = booking.fare?.total || 0;
      // Increment driver stats
      await this.driverModel
        .findByIdAndUpdate(driverId, {
          status: DriverStatus.ACTIVE,
          $inc: {
            totalTrips: 1,
            totalEarningsCents: fareAmount,
            walletBalanceCents: fareAmount,
          },
        })
        .exec();
    }
    await booking.save();

    return {
      success: true,
      message: `Trip status updated to ${newStatus}`,
      booking,
    };
  }

  // Public endpoint for passengers: get online active drivers count and sanitized fleet info
  async getOnlineDrivers(service?: string) {
    const filter: any = {
      isOnline: true,
      status: { $in: [DriverStatus.ACTIVE, DriverStatus.ON_TRIP] },
    };

    if (service && service !== 'all') {
      const normalizedService = service.toLowerCase() === 'chauffeur' ? 'limousine' : service.toLowerCase();
      filter.$or = [
        { 'vehicle.serviceType': normalizedService },
        { 'vehicle.serviceType': 'both' },
      ];
    }

    const onlineDrivers = await this.driverModel
      .find(filter)
      .select('name vehicle.make vehicle.model vehicle.color vehicle.regoPlate vehicle.serviceType vehicle.passengerCapacity rating currentLocation status')
      .exec();

    return {
      success: true,
      count: onlineDrivers.length,
      drivers: onlineDrivers.map((d) => ({
        id: d._id,
        name: d.name.split(' ')[0], // only first name for privacy
        vehicleModel: `${d.vehicle?.make || ''} ${d.vehicle?.model || ''}`.trim(),
        vehicleColor: d.vehicle?.color,
        serviceType: d.vehicle?.serviceType,
        rating: d.rating,
        status: d.status,
        location: d.currentLocation,
      })),
    };
  }
}
