import { Type } from 'class-transformer';
import {
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

export class PlaceLocationDto {
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

export class GetQuotesDto {
  @IsOptional()
  @IsIn(['taxi', 'airport', 'chauffeur'])
  service?: 'taxi' | 'airport' | 'chauffeur';

  @ValidateNested()
  @Type(() => PlaceLocationDto)
  pickup: PlaceLocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlaceLocationDto)
  destination?: PlaceLocationDto;

  @IsOptional()
  @IsString()
  pickupAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  passengers?: number;
}
