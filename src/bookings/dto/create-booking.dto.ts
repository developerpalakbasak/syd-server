import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlaceDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class FareDto {
  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsOptional()
  @IsNumber()
  gstIncluded?: number;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  durationMin?: number;

  @IsOptional()
  lines?: { label: string; amount: number }[];
}

export class CreateBookingDto {
  @IsOptional()
  @IsIn(['taxi', 'airport', 'chauffeur'])
  service?: string;

  // Supports both 'pickup' and 'from' naming convention from forms
  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceDto)
  pickup?: PlaceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceDto)
  from?: PlaceDto;

  // Supports both 'destination' and 'to'
  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceDto)
  destination?: PlaceDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceDto)
  to?: PlaceDto;

  @IsOptional()
  @IsBoolean()
  isNow?: boolean;

  // Pickup date/time (ISO string or datetime format)
  @IsOptional()
  @IsString()
  pickupAt?: string;

  @IsOptional()
  @IsString()
  when?: string;

  // Passenger count (supports 'passengers' and 'pax')
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  passengers?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(14)
  pax?: number;

  // Vehicle type / Category
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  // Guest Passenger Details (No login required)
  @IsString()
  @IsNotEmpty()
  passengerName: string;

  @IsString()
  @IsNotEmpty()
  passengerPhone: string;

  @IsOptional()
  @IsString()
  passengerEmail?: string;

  // Airport transfer specific optional fields
  @IsOptional()
  @IsString()
  flightNumber?: string;

  @IsOptional()
  @IsIn(['pickup', 'dropoff'])
  airportTripType?: string;

  // Additional options
  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  quoteToken?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FareDto)
  fare?: FareDto;
}
