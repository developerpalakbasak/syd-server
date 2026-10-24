import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterPassengerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class LoginPassengerDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // Email or Phone

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RequestOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  phoneOrEmail: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class UpdatePassengerProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  preferredPaymentMethod?: 'cash' | 'card';
}

export class SavePlaceDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;
}
