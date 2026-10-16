import { IsNumber, IsOptional, IsString } from 'class-validator';

export class RouteLocationDetailsDto {
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  code?: string;
}
