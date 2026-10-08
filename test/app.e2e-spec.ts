import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AppModule } from '../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

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

  it('GET /api/v1 - should return server info', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      version: '1.0.0',
    });
    expect(response.body.message).toContain('SYD Server API');
  });

  it('GET /api/v1/test - should return test route status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/test')
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
    });
    expect(response.body.message).toContain('Test API route');
    expect(response.body.uptime).toBeTypeOf('number');
  });

  it('GET /api/v1/health - should return health check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
    });
    expect(response.body.uptime).toBeTypeOf('number');
  });
});
