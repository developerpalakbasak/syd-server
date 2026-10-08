import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlacesService } from './places.service.js';

describe('PlacesService', () => {
  let service: PlacesService;
  let mockPlaceModel: any;

  beforeEach(() => {
    function MockPlace(this: any, data: any) {
      Object.assign(this, data);
      this._id = 'mock-place-id';
      this.save = vi.fn().mockResolvedValue(this);
    }
    MockPlace.find = vi.fn().mockReturnThis();
    MockPlace.findOne = vi.fn().mockReturnThis();
    MockPlace.findById = vi.fn().mockReturnThis();
    MockPlace.findByIdAndUpdate = vi.fn().mockReturnThis();
    MockPlace.findByIdAndDelete = vi.fn().mockReturnThis();
    MockPlace.findOneAndUpdate = vi.fn().mockReturnThis();
    MockPlace.countDocuments = vi.fn().mockReturnThis();
    MockPlace.sort = vi.fn().mockReturnThis();
    MockPlace.skip = vi.fn().mockReturnThis();
    MockPlace.limit = vi.fn().mockReturnThis();
    MockPlace.exec = vi.fn().mockResolvedValue([]);

    mockPlaceModel = MockPlace;
    service = new PlacesService(mockPlaceModel as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a place route fare', async () => {
    const result = await service.create({
      firstPlace: 'Sydney Airport (SYD)',
      lastPlace: 'Sydney CBD',
      fair: 65,
    });

    expect(result).toBeDefined();
    expect(result.firstPlace).toBe('Sydney Airport (SYD)');
    expect(result.lastPlace).toBe('Sydney CBD');
    expect(result.fair).toBe(65);
    expect(result.fare).toBe(65);
    expect(result.currency).toBe('AUD');
  });

  it('should throw BadRequestException if fair or fare is missing', async () => {
    await expect(
      service.create({
        firstPlace: 'Sydney Airport',
        lastPlace: 'CBD',
      } as any),
    ).rejects.toThrow();
  });

  it('should find route fare by firstPlace and lastPlace', async () => {
    const mockRoute = {
      firstPlace: 'Sydney Airport (SYD)',
      lastPlace: 'Sydney CBD',
      fair: 65,
      fare: 65,
    };
    mockPlaceModel.exec.mockResolvedValueOnce(mockRoute);

    const result = await service.findByRoute('Sydney Airport (SYD)', 'Sydney CBD');
    expect(result).toEqual(mockRoute);
  });
});
