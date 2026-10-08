import { IsOptional, IsString } from 'class-validator';

export class QueryPlaceDto {
  @IsOptional()
  @IsString()
  firstPlace?: string;

  @IsOptional()
  @IsString()
  lastPlace?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  isActive?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  skip?: string;
}
