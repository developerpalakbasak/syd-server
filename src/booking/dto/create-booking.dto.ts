export interface PassengerDto {
  name: string;
  phone: string;
  email?: string;
}

export interface LocationDto {
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
}

export class CreateBookingDto {
  passenger: PassengerDto;
  pickupLocation: LocationDto;
  dropoffLocation: LocationDto;
  vehicleType?: string;
  idempotencyKey?: string;
}

export class CancelBookingDto {
  reason?: string;
}
