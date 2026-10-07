import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsOptional()
  @IsIn(['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsIn(['pending', 'paid', 'cash_to_driver', 'card'])
  paymentStatus?: string;

  @IsOptional()
  @IsString()
  cancellationReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
