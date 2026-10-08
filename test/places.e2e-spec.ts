import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('PlacesController (e2e)', () => {
  let app: INestApplication<App>;
  let createdPlaceId: string;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/places/seed - should seed default places', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/places/seed')
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.places)).toBe(true);
  });

  it('GET /api/v1/places - should list all places', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/places')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.places)).toBe(true);
  });

  it('GET /api/v1/places/lookup - should find route by firstPlace and lastPlace', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/places/lookup')
      .query({
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Sydney CBD',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.place).toBeDefined();
    expect(response.body.place.firstPlace).toBe('Sydney Airport (SYD)');
    expect(response.body.place.lastPlace).toBe('Sydney CBD');
    expect(response.body.place.fair).toBe(65);
  });

  it('GET /api/v1/places/lookup - should find route using from and to aliases with partial match', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/places/lookup')
      .query({
        from: 'Sydney Airport',
        to: 'Sydney CBD',
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.place).toBeDefined();
  });

  it('GET /api/v1/places/route/:firstPlace/:lastPlace - should find route via path params', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/places/route/Sydney Airport (SYD)/Sydney CBD')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.place).toBeDefined();
  });

  it('POST /api/v1/places - should create a new place route fare', async () => {
    const payload = {
      firstPlace: 'E2E Test Origin',
      lastPlace: 'E2E Test Destination',
      fair: 88,
      currency: 'AUD',
      distanceKm: 25,
      durationMin: 35,
      notes: 'Automated E2E Test Route',
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/places')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.place).toBeDefined();
    expect(response.body.place.firstPlace).toBe('E2E Test Origin');
    expect(response.body.place.fair).toBe(88);
    expect(response.body.place.fare).toBe(88);

    createdPlaceId = response.body.place._id;
  });

  it('GET /api/v1/places/:id - should get place by ID', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/places/${createdPlaceId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.place._id).toBe(createdPlaceId);
    expect(response.body.place.firstPlace).toBe('E2E Test Origin');
  });

  it('PATCH /api/v1/places/:id - should update place fare', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/places/${createdPlaceId}`)
      .send({ fair: 95, notes: 'Updated E2E Notes' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.place.fair).toBe(95);
    expect(response.body.place.fare).toBe(95);
    expect(response.body.place.notes).toBe('Updated E2E Notes');
  });

  it('DELETE /api/v1/places/:id - should delete place by ID', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/places/${createdPlaceId}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify it is gone
    await request(app.getHttpServer())
      .get(`/api/v1/places/${createdPlaceId}`)
      .expect(404);
  });
});
