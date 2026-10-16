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
import { RouteLocationDetailsDto } from './route-location-details.dto.js';

export class UpdateRouteDto {
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
  increaseFairPerPerson?: number | Record<string, number>;

  @IsOptional()
  increaseFarePerPerson?: number | Record<string, number>;

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
  vehicleType?: string[] | string;

  @IsOptional()
  @IsObject()
  vehicleFares?: Record<string, number>;

  @IsOptional()
  @IsObject()
  vehicleAndFares?: Record<string, number>;

  @IsOptional()
  @ValidateNested()
  @Type(() => RouteLocationDetailsDto)
  firstPlaceDetails?: RouteLocationDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RouteLocationDetailsDto)
  lastPlaceDetails?: RouteLocationDetailsDto;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
