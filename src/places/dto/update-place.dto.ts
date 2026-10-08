import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlaceLocationDetailsDto } from './place-location-details.dto.js';

export class UpdatePlaceDto {
  @IsOptional()
  @IsString()
  firstPlace?: string;

  @IsOptional()
  @IsString()
  lastPlace?: string;

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
