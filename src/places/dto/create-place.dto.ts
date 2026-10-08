import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlaceLocationDetailsDto } from './place-location-details.dto.js';

export class CreatePlaceDto {
  @IsString()
  @IsNotEmpty()
  firstPlace: string;

  @IsString()
  @IsNotEmpty()
  lastPlace: string;

  // Supports 'fair' (user prompt term) and standard 'fare'
  @IsOptional()
  @IsNumber()
  @Min(0)
  fair?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fare?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationMin?: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsObject()
  vehicleFares?: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceLocationDetailsDto)
  firstPlaceDetails?: PlaceLocationDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceLocationDetailsDto)
  lastPlaceDetails?: PlaceLocationDetailsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
