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
    MockPlace.distinct = vi.fn().mockReturnThis();
    MockPlace.select = vi.fn().mockReturnThis();
    MockPlace.lean = vi.fn().mockReturnThis();
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

  it('should throw NotFoundException if route is not found and database has places', async () => {
    mockPlaceModel.exec
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
    mockPlaceModel.exec
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
    mockPlaceModel.exec
      .mockResolvedValueOnce(['Sydney Airport (SYD)', 'Sydney CBD'])
      .mockResolvedValueOnce(['Bondi Beach', 'Parramatta']);

    const places = await service.getAllUniquePlaces({ search: 'airport' });

    expect(places).toEqual(['Sydney Airport (SYD)']);
  });
});
