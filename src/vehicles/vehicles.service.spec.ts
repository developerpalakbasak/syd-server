import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let mockVehicleModel: any;

  beforeEach(() => {
    mockVehicleModel = {
      find: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockReturnThis(),
      findById: vi.fn().mockReturnThis(),
      findByIdAndUpdate: vi.fn().mockReturnThis(),
      findByIdAndDelete: vi.fn().mockReturnThis(),
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };

    service = new VehiclesService(mockVehicleModel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query active vehicles with default filter', async () => {
    mockVehicleModel.exec.mockResolvedValueOnce([
      { name: 'Taxi', slug: 'taxi', isActive: true },
    ]);

    const result = await service.findAll();
    expect(mockVehicleModel.find).toHaveBeenCalledWith({ isActive: true });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe('taxi');
  });

  it('should filter by service and passengers', async () => {
    mockVehicleModel.exec.mockResolvedValueOnce([
      { name: 'SUV', slug: 'suv', supportedServices: ['taxi', 'airport'], passengersMax: 6 },
    ]);

    const result = await service.findAll({ service: 'airport', pax: 5 });
    expect(mockVehicleModel.find).toHaveBeenCalledWith({
      isActive: true,
      supportedServices: 'airport',
      passengersMax: { $gte: 5 },
    });
    expect(result).toHaveLength(1);
  });
});
