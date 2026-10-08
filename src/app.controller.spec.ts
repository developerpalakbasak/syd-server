import { describe, it, expect, beforeEach } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(() => {
    appService = new AppService();
    appController = new AppController(appService);
  });

  describe('root', () => {
    it('should return server status', () => {
      const result = appController.getRoot();
      expect(result.success).toBe(true);
      expect(result.message).toContain('SYD Server API');
    });

    it('should return test message', () => {
      const result = appController.getTest();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test API route');
    });

    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.uptime).toBeTypeOf('number');
    });
  });
});
