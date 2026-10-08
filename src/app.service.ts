import { Injectable } from '@nestjs/common';

// Service providing system status and test responses for root endpoints.
@Injectable()
export class AppService {
  // Returns welcome and basic server information.
  getRoot() {
    return {
      success: true,
      message: 'SYD Server API is active and operational',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  // Returns test route confirmation with uptime.
  getTest() {
    return {
      success: true,
      message: 'Test API route is working successfully!',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  // Returns health check status.
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
