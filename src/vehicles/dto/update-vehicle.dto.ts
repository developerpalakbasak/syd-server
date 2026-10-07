import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedServices?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  passengersMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  passengersMax?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  luggage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exampleModels?: string[];

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerMinute?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFare?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
