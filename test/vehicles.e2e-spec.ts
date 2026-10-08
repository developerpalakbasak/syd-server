import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('VehiclesController (e2e)', () => {
  let app: INestApplication<App>;
  let createdVehicleId: string;

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

  it('POST /api/v1/vehicles/seed - should seed default vehicle fleet', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles/seed')
      .expect(201);

    expect(response.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.vehicles)).toBe(true);
  });

  it('GET /api/v1/vehicles - should list all vehicles', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/vehicles')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.count).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.vehicles)).toBe(true);
  });

  it('GET /api/v1/vehicles/:idOrSlug - should find vehicle by slug (taxi)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/vehicles/taxi')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.vehicle).toBeDefined();
    expect(response.body.vehicle.slug).toBe('taxi');
  });

  it('POST /api/v1/vehicles - should create a new vehicle', async () => {
    const payload = {
      name: 'E2E Test Sedan',
      slug: `e2e-test-sedan-${Date.now()}`,
      group: 'Standard',
      passengersMax: 4,
      basePrice: 5000,
      pricePerKm: 250,
      supportedServices: ['taxi'],
    };

    const response = await request(app.getHttpServer())
      .post('/api/v1/vehicles')
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.vehicle).toBeDefined();
    expect(response.body.vehicle.name).toBe('E2E Test Sedan');

    createdVehicleId = response.body.vehicle._id;
  });

  it('GET /api/v1/vehicles/:idOrSlug - should find vehicle by ObjectId', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${createdVehicleId}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.vehicle._id).toBe(createdVehicleId);
  });

  it('PATCH /api/v1/vehicles/:id - should update vehicle specifications', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/vehicles/${createdVehicleId}`)
      .send({ basePrice: 5500 })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.vehicle.basePrice).toBe(5500);
  });

  it('DELETE /api/v1/vehicles/:id - should delete vehicle', async () => {
    const response = await request(app.getHttpServer())
      .delete(`/api/v1/vehicles/${createdVehicleId}`)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify it is deleted
    await request(app.getHttpServer())
      .get(`/api/v1/vehicles/${createdVehicleId}`)
      .expect(404);
  });
});
