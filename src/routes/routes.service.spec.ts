import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutesService } from './routes.service.js';

describe('RoutesService', () => {
  let service: RoutesService;
  let mockRouteModel: any;

  beforeEach(() => {
    function MockRoute(this: any, data: any) {
      Object.assign(this, data);
      this._id = 'mock-route-id';
      this.save = vi.fn().mockResolvedValue(this);
    }
    MockRoute.find = vi.fn().mockReturnThis();
    MockRoute.findOne = vi.fn().mockReturnThis();
    MockRoute.findById = vi.fn().mockReturnThis();
    MockRoute.findByIdAndUpdate = vi.fn().mockReturnThis();
    MockRoute.findByIdAndDelete = vi.fn().mockReturnThis();
    MockRoute.findOneAndUpdate = vi.fn().mockReturnThis();
    MockRoute.countDocuments = vi.fn().mockReturnThis();
    MockRoute.distinct = vi.fn().mockReturnThis();
    MockRoute.select = vi.fn().mockReturnThis();
    MockRoute.lean = vi.fn().mockReturnThis();
    MockRoute.sort = vi.fn().mockReturnThis();
    MockRoute.skip = vi.fn().mockReturnThis();
    MockRoute.limit = vi.fn().mockReturnThis();
    MockRoute.exec = vi.fn().mockResolvedValue(null);

    mockRouteModel = MockRoute;
    service = new RoutesService(mockRouteModel as any);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a route fare', async () => {
    const result = await service.create({
      firstPlace: 'Sydney Airport (SYD)',
      lastPlace: 'Sydney CBD',
      vehicleAndFares: { taxi: 65, suv: 95 },
      increaseFarePerPerson: { taxi: 10, suv: 12 },
    });

    expect(result).toBeDefined();
    expect(result.firstPlace).toBe('Sydney Airport (SYD)');
    expect(result.lastPlace).toBe('Sydney CBD');
    expect(result.vehicleAndFares).toEqual({ taxi: 65, suv: 95 });
    expect(result.increaseFarePerPerson).toEqual({ taxi: 10, suv: 12 });
    expect(result.currency).toBe('AUD');
  });

  it('should throw ConflictException if route already exists', async () => {
    mockRouteModel.exec.mockResolvedValueOnce({
      _id: 'existing-id',
      firstPlace: 'Sydney Airport (SYD)',
      lastPlace: 'Sydney CBD',
    });

    await expect(
      service.create({
        firstPlace: 'Sydney Airport (SYD)',
        lastPlace: 'Sydney CBD',
        fair: 65,
      }),
    ).rejects.toThrow();
  });

  it('should find route fare by firstPlace and lastPlace', async () => {
    const mockRoute = {
      firstPlace: 'Sydney Airport (SYD)',
      lastPlace: 'Sydney CBD',
      fair: 65,
      fare: 65,
    };
    mockRouteModel.exec.mockResolvedValueOnce(mockRoute);

    const result = await service.findByRoute('Sydney Airport (SYD)', 'Sydney CBD');
    expect(result).toEqual(mockRoute);
  });

  it('should throw NotFoundException if route is not found and database has routes', async () => {
    mockRouteModel.exec
      .mockResolvedValueOnce(null) // exact
      .mockResolvedValueOnce(null) // reverse
      .mockResolvedValueOnce(null) // partial
      .mockResolvedValueOnce(null) // reverse partial
      .mockResolvedValueOnce(5); // countDocuments

    await expect(
      service.findByRoute('Nowhere', 'Somewhere'),
    ).rejects.toThrow();
  });

  it('should get all unique places deduplicated from firstPlace and lastPlace', async () => {
    // Return distinct firstPlaces and lastPlaces with overlapping values
    mockRouteModel.exec
      .mockResolvedValueOnce(['Sydney Airport (SYD)', 'Sydney CBD'])
      .mockResolvedValueOnce(['Sydney CBD', 'Bondi Beach', 'Sydney Airport (SYD)']);

    const places = await service.getAllUniquePlaces();

    // Every place must be returned exactly once, sorted alphabetically
    expect(places).toEqual([
      'Bondi Beach',
      'Sydney Airport (SYD)',
      'Sydney CBD',
    ]);
  });

  it('should filter unique places by search keyword', async () => {
    mockRouteModel.exec
      .mockResolvedValueOnce(['Sydney Airport (SYD)', 'Sydney CBD'])
      .mockResolvedValueOnce(['Bondi Beach', 'Parramatta']);

    const places = await service.getAllUniquePlaces({ search: 'airport' });

    expect(places).toEqual(['Sydney Airport (SYD)']);
  });
});
