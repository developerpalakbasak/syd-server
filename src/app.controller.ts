import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

// Root controller providing status, test, and health check endpoints under /api/v1.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // GET /api/v1 - Root API info
  @Get()
  getRoot() {
    return this.appService.getRoot();
  }

  // GET /api/v1/test - Test route verification
  @Get('test')
  getTest() {
    return this.appService.getTest();
  }

  // GET /api/v1/health - System health check
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
