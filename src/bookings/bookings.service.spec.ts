import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BookingsService } from './bookings.service.js';

describe('BookingsService', () => {
  let service: BookingsService;
  let mockBookingModel: any;
  let mockVehicleModel: any;

  beforeEach(() => {
    // Model constructor simulation
    function MockBooking(this: any, data: any) {
      Object.assign(this, data);
      this._id = 'mock-booking-id';
      this.save = vi.fn().mockResolvedValue(this);
    }
    MockBooking.exists = vi.fn().mockResolvedValue(null);
    MockBooking.find = vi.fn().mockReturnThis();
    MockBooking.findOne = vi.fn().mockReturnThis();
    MockBooking.findById = vi.fn().mockReturnThis();
    MockBooking.countDocuments = vi.fn().mockResolvedValue(1);
    MockBooking.sort = vi.fn().mockReturnThis();
    MockBooking.skip = vi.fn().mockReturnThis();
    MockBooking.limit = vi.fn().mockReturnThis();
    MockBooking.populate = vi.fn().mockReturnThis();
    MockBooking.exec = vi.fn().mockResolvedValue([]);

    mockBookingModel = MockBooking;

    mockVehicleModel = {
      findOne: vi.fn().mockReturnThis(),
      findById: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        _id: 'vehicle-123',
        slug: 'taxi',
        name: 'Taxi',
        basePrice: 4500,
        exampleModels: ['Toyota Camry'],
        luggage: 2,
      }),
    };

    service = new BookingsService(mockBookingModel as any, mockVehicleModel as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a guest booking with from, to, date-time, passengers, vehicleType and passenger contact', async () => {
    const booking = await service.create({
      from: { name: 'Sydney Airport', lat: -33.9399, lng: 151.1753 },
      to: { name: 'Circular Quay', lat: -33.8614, lng: 151.2108 },
      when: '2026-10-10T10:00:00.000Z',
      pax: 2,
      vehicleType: 'taxi',
      passengerName: 'John Citizen',
      passengerPhone: '0412345678',
    });

    expect(booking).toBeDefined();
    expect(booking.bookingNumber).toMatch(/^SYD-[A-Z0-9]{6}$/);
    expect(booking.passengerName).toBe('John Citizen');
    expect(booking.passengerPhone).toBe('0412345678');
    expect(booking.passengers).toBe(2);
    expect(booking.status).toBe('confirmed');
    expect(booking.pickup.name).toBe('Sydney Airport');
    expect(booking.destination?.name).toBe('Circular Quay');
  });

  it('should throw BadRequestException if pickup is missing', async () => {
    await expect(
      service.create({
        passengerName: 'Jane',
        passengerPhone: '0412345678',
      } as any),
    ).rejects.toThrow();
  });
});
