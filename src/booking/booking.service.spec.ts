import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingService } from './booking.service.js';
import { BookingStatus } from './booking-status.enum.js';

describe('BookingService', () => {
  let service: BookingService;
  let mockBookingModel: any;

  beforeEach(() => {
    mockBookingModel = function (this: any, dto: any) {
      Object.assign(this, dto);
      this.save = vi.fn().mockResolvedValue({
        _id: 'mock_booking_id',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    };

    mockBookingModel.findOne = vi.fn();
    mockBookingModel.findById = vi.fn();
    mockBookingModel.find = vi.fn();

    service = new BookingService(mockBookingModel as any);
  });

  it('allows a guest passenger to create a booking without a user account', async () => {
    mockBookingModel.findOne = vi.fn().mockResolvedValue(null);

    const guestPayload = {
      passenger: {
        name: 'John Doe',
        phone: '+1234567890',
        email: 'john@example.com',
      },
      pickupLocation: {
        address: '123 Main St, Sydney',
        coordinates: [151.2093, -33.8688] as [number, number],
      },
      dropoffLocation: {
        address: 'Sydney Airport, Terminal 1',
        coordinates: [151.1772, -33.9399] as [number, number],
      },
      vehicleType: 'Sedan',
    };

    const result = await service.createBooking(guestPayload);

    expect(result).toBeDefined();
    expect(result.passenger.name).toBe('John Doe');
    expect(result.passenger.phone).toBe('+1234567890');
    expect(result.status).toBe(BookingStatus.REQUESTED);
    expect(result.trackingToken).toBeDefined();
    expect(typeof result.trackingToken).toBe('string');
  });

  it('allows a guest passenger to retrieve their booking using the tracking token', async () => {
    const mockBooking = {
      _id: 'mock_id',
      trackingToken: 'valid-tracking-token-123',
      passenger: { name: 'Jane Doe', phone: '+9876543210' },
      status: BookingStatus.DRIVER_ASSIGNED,
    };

    mockBookingModel.findOne = vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockBooking),
      }),
    });

    const result = await service.getBookingByTrackingToken('valid-tracking-token-123');
    expect(result).toBeDefined();
    expect(result.trackingToken).toBe('valid-tracking-token-123');
    expect(result.status).toBe(BookingStatus.DRIVER_ASSIGNED);
  });
});
