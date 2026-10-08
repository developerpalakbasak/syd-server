import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

// Bootstraps and launches the NestJS application with CORS, global validation, and configured port.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Server is running on port ${port} with prefix /api/v1`);
}
await bootstrap();
