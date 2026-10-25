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
import { Passenger, PassengerDocument } from './schemas/passenger.schema.js';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema.js';
import {
  RegisterPassengerDto,
  LoginPassengerDto,
  RequestOtpDto,
  VerifyOtpDto,
  UpdatePassengerProfileDto,
  SavePlaceDto,
} from './dto/passenger.dto.js';
import {
  hashPassword,
  verifyPassword,
  parseDurationMs,
  cleanEnvValue,
} from '../admin/admin.service.js';

export interface PassengerJwtPayload {
  sub: string;
  email: string;
  phone: string;
  name: string;
  role: 'passenger';
}

@Injectable()
export class PassengersService {
  constructor(
    @InjectModel(Passenger.name)
    private readonly passengerModel: Model<PassengerDocument>,
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret(): string {
    return (
      cleanEnvValue(this.configService.get('JWT_SECRET')) ||
      cleanEnvValue(process.env.JWT_SECRET) ||
      'supersecretjwtkey_sydtransfer_2026'
    );
  }

  getTokenValidity(): string {
    return (
      cleanEnvValue(this.configService.get('OTHER_TOKEN_VALIDITY')) ||
      cleanEnvValue(process.env.OTHER_TOKEN_VALIDITY) ||
      '30d'
    );
  }

  getTokenValidityMs(): number {
    return parseDurationMs(this.getTokenValidity(), 30 * 24 * 60 * 60 * 1000);
  }

  // Issue standard Passenger JWT token valid according to OTHER_TOKEN_VALIDITY
  generateToken(passenger: PassengerDocument): string {
    const payload: PassengerJwtPayload = {
      sub: passenger._id.toString(),
      email: passenger.email,
      phone: passenger.phone,
      name: passenger.name,
      role: 'passenger',
    };
    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: this.getTokenValidity() as jwt.SignOptions['expiresIn'],
    });
  }

  // Verify and decode JWT token
  verifyToken(token: string): PassengerJwtPayload {
    try {
      return jwt.verify(token, this.getJwtSecret()) as PassengerJwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  // Auto-link any past bookings with matching phone or email
  async linkPastBookings(passengerId: Types.ObjectId, phone: string, email: string) {
    try {
      await this.bookingModel
        .updateMany(
          {
            $or: [{ passengerPhone: phone }, { passengerEmail: email }],
            passengerId: { $exists: false },
          },
          { $set: { passengerId } },
        )
        .exec();
    } catch (e) {
      console.warn('Failed to link past bookings:', e);
    }
  }

  // Register passenger
  async register(dto: RegisterPassengerDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();

    const existing = await this.passengerModel
      .findOne({ $or: [{ email }, { phone }] })
      .exec();

    if (existing) {
      if (existing.email === email) {
        throw new ConflictException('An account with this email already exists');
      }
      throw new ConflictException('An account with this phone number already exists');
    }

    const passwordHash = dto.password ? hashPassword(dto.password) : undefined;

    const passenger = new this.passengerModel({
      name: dto.name.trim(),
      email,
      phone,
      passwordHash,
      isPhoneVerified: false,
      isEmailVerified: false,
      isActive: true,
    });

    const saved = await passenger.save();
    await this.linkPastBookings(saved._id as Types.ObjectId, phone, email);

    const token = this.generateToken(saved);

    return {
      success: true,
      message: 'Account registered successfully',
      passenger: {
        id: saved._id,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
      },
      token,
    };
  }

  // Password-based login
  async login(dto: LoginPassengerDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const passenger = await this.passengerModel
      .findOne({
        $or: [{ email: identifier }, { phone: dto.identifier.trim() }],
      })
      .select('+passwordHash')
      .exec();

    if (!passenger || !passenger.passwordHash) {
      throw new UnauthorizedException('Invalid credentials or password not set for this account');
    }

    if (!verifyPassword(dto.password, passenger.passwordHash)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(passenger);

    return {
      success: true,
      message: 'Logged in successfully',
      passenger: {
        id: passenger._id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
      },
      token,
    };
  }

  // Request 6-digit OTP for passwordless login / quick verification
  async requestOtp(dto: RequestOtpDto) {
    const query = dto.phoneOrEmail.trim().toLowerCase();
    let passenger = await this.passengerModel
      .findOne({
        $or: [{ email: query }, { phone: dto.phoneOrEmail.trim() }],
      })
      .exec();

    // Development default OTP: 123456 or random 6 digits
    const otp = process.env.NODE_ENV === 'production'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (!passenger) {
      // Auto-create provisional passenger account
      const isEmail = query.includes('@');
      passenger = new this.passengerModel({
        name: isEmail ? query.split('@')[0] : 'Passenger',
        email: isEmail ? query : `${query.replace(/[^0-9]/g, '')}@sydairporttransfer.local`,
        phone: isEmail ? '' : dto.phoneOrEmail.trim(),
        otpCode: hashPassword(otp),
        otpExpiresAt: expiresAt,
        isActive: true,
      });
      await passenger.save();
    } else {
      passenger.otpCode = hashPassword(otp);
      passenger.otpExpiresAt = expiresAt;
      await passenger.save();
    }

    console.log(`[PASSENGER OTP] Code for ${dto.phoneOrEmail}: ${otp}`);

    return {
      success: true,
      message: 'Verification code sent to your phone/email',
      debugCode: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  // Verify OTP and complete login
  async verifyOtp(dto: VerifyOtpDto) {
    const query = dto.phoneOrEmail.trim().toLowerCase();
    const passenger = await this.passengerModel
      .findOne({
        $or: [{ email: query }, { phone: dto.phoneOrEmail.trim() }],
      })
      .select('+otpCode +otpExpiresAt')
      .exec();

    if (!passenger || !passenger.otpCode || !passenger.otpExpiresAt) {
      throw new BadRequestException('No verification request found. Please request a new code.');
    }

    if (new Date() > passenger.otpExpiresAt) {
      throw new BadRequestException('Verification code has expired. Please request a new code.');
    }

    if (!verifyPassword(dto.otp.trim(), passenger.otpCode)) {
      throw new BadRequestException('Invalid verification code');
    }

    // Mark verified
    passenger.otpCode = undefined;
    passenger.otpExpiresAt = undefined;
    if (dto.phoneOrEmail.includes('@')) {
      passenger.isEmailVerified = true;
    } else {
      passenger.isPhoneVerified = true;
    }
    await passenger.save();

    await this.linkPastBookings(passenger._id as Types.ObjectId, passenger.phone, passenger.email);

    const token = this.generateToken(passenger);

    return {
      success: true,
      message: 'Verified and logged in successfully',
      passenger: {
        id: passenger._id,
        name: passenger.name,
        email: passenger.email,
        phone: passenger.phone,
      },
      token,
    };
  }

  // Get passenger profile
  async getProfile(passengerId: string) {
    const passenger = await this.passengerModel.findById(passengerId).exec();
    if (!passenger) throw new NotFoundException('Passenger not found');

    return {
      success: true,
      passenger,
    };
  }

  // Update profile
  async updateProfile(passengerId: string, dto: UpdatePassengerProfileDto) {
    const passenger = await this.passengerModel
      .findByIdAndUpdate(passengerId, { $set: dto }, { returnDocument: 'after' })
      .exec();

    if (!passenger) throw new NotFoundException('Passenger not found');

    return {
      success: true,
      message: 'Profile updated successfully',
      passenger,
    };
  }

  // Save favorite place (e.g. Home, Office, Airport)
  async addSavedPlace(passengerId: string, place: SavePlaceDto) {
    const passenger = await this.passengerModel.findById(passengerId).exec();
    if (!passenger) throw new NotFoundException('Passenger not found');

    passenger.savedPlaces.push({
      label: place.label,
      name: place.name,
      address: place.address || '',
      lat: place.lat,
      lng: place.lng,
    });
    await passenger.save();

    return {
      success: true,
      message: 'Place saved successfully',
      savedPlaces: passenger.savedPlaces,
    };
  }

  // Remove saved place
  async removeSavedPlace(passengerId: string, placeIndex: number) {
    const passenger = await this.passengerModel.findById(passengerId).exec();
    if (!passenger) throw new NotFoundException('Passenger not found');

    passenger.savedPlaces.splice(placeIndex, 1);
    await passenger.save();

    return {
      success: true,
      message: 'Place removed',
      savedPlaces: passenger.savedPlaces,
    };
  }

  // Get trips belonging to passenger (active & past)
  async getPassengerTrips(passengerId: string) {
    const passenger = await this.passengerModel.findById(passengerId).exec();
    if (!passenger) throw new NotFoundException('Passenger not found');

    const trips = await this.bookingModel
      .find({
        $or: [
          { passengerId: new Types.ObjectId(passengerId) },
          { passengerPhone: passenger.phone },
          { passengerEmail: passenger.email },
        ],
      })
      .sort({ createdAt: -1 })
      .populate('driver', 'name phone vehicle rating')
      .populate('vehicle')
      .exec();

    const activeTrips = trips.filter((t) =>
      ['confirmed', 'assigned', 'on_the_way', 'arrived', 'in_progress'].includes(t.status),
    );
    const pastTrips = trips.filter((t) => ['completed', 'cancelled'].includes(t.status));

    return {
      success: true,
      total: trips.length,
      activeTrips,
      pastTrips,
    };
  }
}
