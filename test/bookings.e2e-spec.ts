import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { Booking } from '../src/bookings/schemas/booking.schema.js';

describe('BookingsController (e2e)', () => {
  let app: INestApplication<App>;
  let createdBookingNumber: string;
  let createdBookingId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
      }),
    );
    await app.init();

    const bookingModel = app.get<Model<any>>(getModelToken(Booking.name));
    try {
      await bookingModel.syncIndexes();
    } catch {
      // ignore
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/bookings - should create a new guest booking', async () => {
    const payload = {
      service: 'airport',
      isNow: true,
      from: {
        name: 'Sydney Airport T1',
        address: 'Airport Dr, Mascot NSW 2020',
        lat: -33.9399,
        lng: 151.1753,
      },
      to: {
        name: 'Four Seasons Hotel Sydney',
        address: '199 George St, The Rocks NSW 2000',
        lat: -33.8617,
        lng: 151.2084,
      },
      pax: 2,
      vehicleType: 'taxi',
      passengerName: 'E2E Tester',
      passengerPhone: '0499887766',
      passengerEmail: 'e2e@example.com',
      notes: 'Automated E2E booking test',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/bookings')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.booking).toBeDefined();
    expect(response.body.booking.number).toMatch(/^SYD-[A-Z0-9]{6}$/);
    expect(response.body.booking.status).toBe('confirmed');
    expect(response.body.booking.passengerName).toBe('E2E Tester');

    createdBookingNumber = response.body.booking.number;
    createdBookingId = response.body.booking.id;
  });

  it('GET /api/v1/bookings - should list bookings', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/bookings')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.bookings)).toBe(true);
  });

  it('GET /api/v1/bookings/:refOrId - should find booking by reference number', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${createdBookingNumber}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.booking.bookingNumber).toBe(createdBookingNumber);
  });

  it('GET /api/v1/bookings/:refOrId - should find booking by ObjectId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/bookings/${createdBookingId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.booking._id).toBe(createdBookingId);
  });

  it('PATCH /api/v1/bookings/:refOrId/status - should update status and payment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/bookings/${createdBookingNumber}/status`)
      .send({
        status: 'assigned',
        paymentStatus: 'paid',
        notes: 'Driver assigned for pickup',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.booking.status).toBe('assigned');
    expect(response.body.booking.paymentStatus).toBe('paid');
  });

  it('POST /api/v1/bookings/:refOrId/cancel - should cancel booking with reason', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/bookings/${createdBookingNumber}/cancel`)
      .send({ reason: 'Trip rescheduled by customer' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.booking.status).toBe('cancelled');
    expect(response.body.booking.cancellationReason).toBe('Trip rescheduled by customer');
  });
});
