import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Booking API (e2e)', () => {
  let app: INestApplication<App>;
  let createdTrackingToken: string;
  let createdBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Public Guest Booking Flow (No Account Required)', () => {
    it('POST /api/v1/bookings - should allow a guest passenger to create a booking', async () => {
      const guestPayload = {
        passenger: {
          name: 'Sarah Connor',
          phone: '+61400111222',
          email: 'sarah@example.com',
        },
        pickupLocation: {
          address: 'George Street, Sydney NSW 2000',
          coordinates: [151.2069, -33.8708],
        },
        dropoffLocation: {
          address: 'Bondi Beach, NSW 2026',
          coordinates: [151.2743, -33.8915],
        },
        vehicleType: 'Comfort',
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send(guestPayload)
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body._id).toBeDefined();
      expect(res.body.passenger.name).toBe('Sarah Connor');
      expect(res.body.passenger.phone).toBe('+61400111222');
      expect(res.body.status).toBe('REQUESTED');
      expect(res.body.trackingToken).toBeDefined();

      createdBookingId = res.body._id;
      createdTrackingToken = res.body.trackingToken;
    });

    it('POST /api/v1/bookings - should return 400 when required passenger details are missing', async () => {
      const invalidPayload = {
        pickupLocation: {
          address: 'George Street, Sydney NSW 2000',
          coordinates: [151.2069, -33.8708],
        },
        dropoffLocation: {
          address: 'Bondi Beach, NSW 2026',
          coordinates: [151.2743, -33.8915],
        },
      };

      const res = await request(app.getHttpServer())
        .post('/api/v1/bookings')
        .send(invalidPayload)
        .expect(400);

      expect(res.body.message).toContain('Passenger name and phone are required');
    });

    it('GET /api/v1/bookings/track/:token - should allow guest to track booking using trackingToken', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/bookings/track/${createdTrackingToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.trackingToken).toBe(createdTrackingToken);
      expect(res.body.status).toBe('REQUESTED');
      expect(res.body.passenger.name).toBe('Sarah Connor');
    });

    it('GET /api/v1/bookings/track/:token - should return 404 for invalid tracking token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/bookings/track/non-existent-token-999')
        .expect(404);
    });

    it('POST /api/v1/bookings/cancel/:token - should allow guest to cancel ride before driver arrives', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/cancel/${createdTrackingToken}`)
        .send({ reason: 'Trip plans changed' })
        .expect(201);

      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.cancellationDetails.cancelledBy).toBe('PASSENGER');
      expect(res.body.cancellationDetails.reason).toBe('Trip plans changed');
    });
  });

  describe('Protected Staff Endpoints (Driver & Admin Accounts Required)', () => {
    it('GET /api/v1/bookings - should block unauthenticated requests with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/bookings')
        .expect(403);

      expect(res.body.message).toBe('User roles not found');
    });

    it('POST /api/v1/bookings/:id/accept - should block unauthenticated requests with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${createdBookingId}/accept`)
        .expect(403);

      expect(res.body.message).toBe('User roles not found');
    });

    it('POST /api/v1/bookings/:id/assign - should block unauthenticated requests with 403 Forbidden', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/bookings/${createdBookingId}/assign`)
        .send({ driverId: '507f1f77bcf86cd799439011' })
        .expect(403);

      expect(res.body.message).toBe('User roles not found');
    });
  });
});
