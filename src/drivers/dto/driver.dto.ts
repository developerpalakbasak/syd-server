import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { DriverServiceType } from '../schemas/driver.schema.js';

export class RegisterDriverDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @MinLength(6)
  password: string;

  // Vehicle info
  @IsString()
  @IsNotEmpty()
  make: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsInt()
  @Min(2005)
  year: number;

  @IsString()
  @IsNotEmpty()
  regoPlate: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @IsEnum(DriverServiceType)
  serviceType: DriverServiceType;

  @IsInt()
  @IsOptional()
  passengerCapacity?: number;

  @IsInt()
  @IsOptional()
  luggageCapacity?: number;

  // Documents
  @IsString()
  @IsOptional()
  driverLicenseNumber?: string;

  @IsString()
  @IsOptional()
  pointToPointCardNumber?: string;

  @IsString()
  @IsOptional()
  abnNumber?: string;

  @IsString()
  @IsOptional()
  insurancePolicyNumber?: string;
}

export class LoginDriverDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateDriverStatusDto {
  @IsNotEmpty()
  isOnline: boolean;

  @IsNumber()
  @IsOptional()
  lat?: number;

  @IsNumber()
  @IsOptional()
  lng?: number;
}
