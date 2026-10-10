# SYD Server API Documentation

Comprehensive API reference and manual testing guide for the **SYD Server** backend.

- **Base URL:** `http://localhost:4000/api/v1`
- **Default Port:** `4000` (or `PORT` from `.env`)
- **Headers:** `Content-Type: application/json`

---

## Table of Contents
0. [Root & System Health Test Endpoints (`/`)](#0-root--system-health-test-endpoints-)
   - [API Root Status](#01-api-root-status)
   - [API Test Route](#02-api-test-route)
   - [Health Check](#03-health-check)
1. [Places & Route Fares (`/places`)](#1-places--route-fares-places)
   - [Seed Default Route Fares](#11-seed-default-route-fares)
   - [List All Route Fares](#12-list-all-route-fares)
   - [Get All Unique Places](#13-get-all-unique-places)
   - [Lookup Fare by Route](#14-lookup-fare-by-firstplace--lastplace)
   - [Get Single Place Route by ID](#15-get-single-route-fare-by-id)
   - [Create New Place Route Fare](#16-create-new-place-route-fare)
   - [Update Place Route Fare](#17-update-place-route-fare)
   - [Delete Place Route Fare](#18-delete-place-route-fare)
2. [Vehicles Fleet Catalog (`/vehicles`)](#2-vehicles-fleet-catalog-vehicles)
   - [Seed Default Vehicles](#21-seed-default-vehicles)
   - [List Vehicles](#22-list-vehicles)
   - [Get Vehicle by Slug or ID](#23-get-vehicle-by-slug-or-id)
   - [Create New Vehicle](#24-create-new-vehicle)
   - [Update Vehicle](#25-update-vehicle)
   - [Delete Vehicle](#26-delete-vehicle)
3. [Bookings Management (`/bookings`)](#3-bookings-management-bookings)
   - [Create Guest Booking](#31-create-guest-booking)
   - [List Bookings](#32-list-bookings)
   - [Lookup Booking by Reference or ID](#33-lookup-booking-by-reference-or-id)
   - [Update Booking Status](#34-update-booking-status)
   - [Cancel Booking](#35-cancel-booking)

---

## 0. Root & System Health Test Endpoints (`/`)

Basic test routes for pinging server status and validating API prefix connectivity.

### 0.1 API Root Status
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1`
```bash
curl -X GET http://localhost:4000/api/v1
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "SYD Server API is active and operational",
  "version": "1.0.0",
  "timestamp": "2026-10-08T09:00:00.000Z"
}
```

### 0.2 API Test Route
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/test`
```bash
curl -X GET http://localhost:4000/api/v1/test
```
**Response (`200 OK`):**
```json
{
  "success": true,
  "message": "Test API route is working successfully!",
  "timestamp": "2026-10-08T09:00:00.000Z",
  "uptime": 124.5
}
```

### 0.3 Health Check
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/health`
```bash
curl -X GET http://localhost:4000/api/v1/health
```
**Response (`200 OK`):**
```json
{
  "status": "ok",
  "uptime": 124.5,
  "timestamp": "2026-10-08T09:00:00.000Z"
}
```

---

## 1. Places & Route Fares (`/places`)

Manage fixed-route pricing catalog where admin configures `firstPlace`, `lastPlace`, and their `fair` (fare).

---

### 1.1 Seed Default Route Fares
Populates the database with standard Sydney transfer routes (Sydney Airport ↔ CBD, Bondi Beach, Parramatta, Manly, Chatswood, etc.).

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/places/seed`
- **Body:** None

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/places/seed \
  -H "Content-Type: application/json"
```

#### Expected Response (`201 Created`)
```json
{
  "success": true,
  "message": "Successfully seeded 7 default place route fares",
  "count": 7,
  "places": [
    {
      "_id": "660c1f2e9b8214a1a5b82001",
      "firstPlace": "Sydney Airport (SYD)",
      "lastPlace": "Sydney CBD",
      "fair": 65,
      "fare": 65,
      "currency": "AUD",
      "distanceKm": 14,
      "durationMin": 25,
      "vehicleType": "all",
      "firstPlaceDetails": {
        "address": "Mascot NSW 2020",
        "lat": -33.9399,
        "lng": 151.1753,
        "code": "SYD"
      },
      "lastPlaceDetails": {
        "address": "Sydney NSW 2000",
        "lat": -33.8688,
        "lng": 151.2093,
        "code": "CBD"
      },
      "isActive": true,
      "notes": "Popular airport to downtown transfer route"
    }
  ]
}
```

---

### 1.2 List All Route Fares
Retrieves all route fare entries with search, filtering, and pagination.

- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/places`
- **Query Parameters (All optional):**
  - `search` (string) — Search term matching either `firstPlace`, `lastPlace`, or `notes`
  - `firstPlace` (string) — Regex filter on first place name
  - `lastPlace` (string) — Regex filter on last place name
  - `isActive` (`true` | `false`) — Filter active routes
  - `vehicleType` (string) — Filter by vehicle type (e.g. `taxi`, `luxury`, `all`)
  - `limit` (number, default: `50`) — Items per page
  - `skip` (number, default: `0`) — Number of items to skip

#### Example URLs
- `http://localhost:4000/api/v1/places`
- `http://localhost:4000/api/v1/places?search=Airport`
- `http://localhost:4000/api/v1/places?firstPlace=Sydney&isActive=true&limit=10`

#### cURL
```bash
curl -X GET "http://localhost:4000/api/v1/places?limit=10"
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "places": [
    {
      "_id": "660c1f2e9b8214a1a5b82001",
      "firstPlace": "Sydney Airport (SYD)",
      "lastPlace": "Sydney CBD",
      "fair": 65,
      "fare": 65,
      "currency": "AUD",
      "distanceKm": 14,
      "durationMin": 25,
      "vehicleType": "all",
      "isActive": true
    }
  ],
  "total": 1,
  "limit": 10,
  "skip": 0
}
```

---

### 1.3 Get All Unique Places
Retrieves a deduplicated array of all unique place locations extracted from both `firstPlace` and `lastPlace`. Guarantees each place appears exactly once in the returned array. Perfect for populating pickup and destination dropdowns and autocomplete lists.

- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/places/all`
- **Aliases:**
  - `http://localhost:4000/api/v1/places/unique`
  - `http://localhost:4000/api/v1/places/names`
  - `http://localhost:4000/api/v1/places?unique=true`
- **Query Parameters (All optional):**
  - `search` (or `q`): Filter places matching keyword (case-insensitive substring)
  - `isActive` (`true` | `false`): Filter places only from active routes
  - `raw` (`true`): Returns the plain JSON string array directly instead of the response wrapper
  - `details` (`true`): Returns places as objects with coordinates, address, and code metadata

#### cURL (Basic Unique Places Array)
```bash
curl -X GET http://localhost:4000/api/v1/places/all
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "count": 7,
  "places": [
    "Bondi Beach",
    "Chatswood",
    "Manly",
    "Manly Beach",
    "Parramatta",
    "Sydney Airport (SYD)",
    "Sydney CBD"
  ]
}
```

#### cURL (Filtered by Search Term)
```bash
curl -X GET "http://localhost:4000/api/v1/places/all?search=Airport"
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "count": 1,
  "places": [
    "Sydney Airport (SYD)"
  ]
}
```

---

### 1.4 Lookup Fare by `firstPlace` & `lastPlace`
Performs a case-insensitive route lookup for quick price checks between pickup and destination. Supports exact matches, reverse direction, and partial name matching.

> **Note:** If testing on a fresh database, call `POST /api/v1/places/seed` first to populate the default routes!

- **Method:** `GET`
- **URL (URL-Encoded for browser/Postman):**
  `http://localhost:4000/api/v1/places/lookup?firstPlace=Sydney%20Airport%20(SYD)&lastPlace=Sydney%20CBD`
- **URL (Alternative query aliases):**
  `http://localhost:4000/api/v1/places/lookup?from=Sydney%20Airport&to=Sydney%20CBD`
- **URL (Path parameter alternative):**
  `http://localhost:4000/api/v1/places/route/Sydney%20Airport%20(SYD)/Sydney%20CBD`
- **Query Parameters:**
  - `firstPlace` (or `from` / `pickup`): name of the pickup location
  - `lastPlace` (or `to` / `destination`): name of the destination location

#### cURL (Query Parameters)
```bash
curl -X GET "http://localhost:4000/api/v1/places/lookup?firstPlace=Sydney%20Airport%20(SYD)&lastPlace=Sydney%20CBD"
```

#### cURL (Using `from` and `to` aliases with partial names)
```bash
curl -X GET "http://localhost:4000/api/v1/places/lookup?from=Sydney%20Airport&to=Sydney%20CBD"
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "place": {
    "_id": "660c1f2e9b8214a1a5b82001",
    "firstPlace": "Sydney Airport (SYD)",
    "lastPlace": "Sydney CBD",
    "fair": 65,
    "fare": 65,
    "currency": "AUD",
    "distanceKm": 14,
    "durationMin": 25,
    "vehicleType": "all",
    "isActive": true
  }
}
```

---

### 1.5 Get Single Route Fare by ID
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/places/:id`

#### cURL
```bash
curl -X GET http://localhost:4000/api/v1/places/660c1f2e9b8214a1a5b82001
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "place": {
    "_id": "660c1f2e9b8214a1a5b82001",
    "firstPlace": "Sydney Airport (SYD)",
    "lastPlace": "Sydney CBD",
    "fair": 65,
    "fare": 65,
    "currency": "AUD",
    "isActive": true
  }
}
```

---

### 1.6 Create New Place Route Fare
Store a new route and its fair. Both `fair` and `fare` keys are accepted and automatically synced.

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/places`
- **Headers:** `Content-Type: application/json`

#### Demo Payload (Full Details)
```json
{
  "firstPlace": "Sydney Airport (SYD)",
  "lastPlace": "Wollongong",
  "fair": 180,
  "currency": "AUD",
  "distanceKm": 78,
  "durationMin": 70,
  "vehicleType": "all",
  "vehicleFares": {
    "taxi": 180,
    "executive": 230,
    "luxury": 320,
    "suv": 260
  },
  "firstPlaceDetails": {
    "address": "Airport Dr, Mascot NSW 2020",
    "lat": -33.9399,
    "lng": 151.1753,
    "code": "SYD"
  },
  "lastPlaceDetails": {
    "address": "Wollongong NSW 2500",
    "lat": -34.4278,
    "lng": 150.8931
  },
  "isActive": true,
  "notes": "South Coast regional transfer rate"
}
```

#### Demo Payload (Minimal Required)
```json
{
  "firstPlace": "Central Station",
  "lastPlace": "Coogee Beach",
  "fair": 45
}
```

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/places \
  -H "Content-Type: application/json" \
  -d '{
    "firstPlace": "Central Station",
    "lastPlace": "Coogee Beach",
    "fair": 45,
    "currency": "AUD",
    "distanceKm": 9,
    "durationMin": 22
  }'
```

#### Expected Response (`201 Created`)
```json
{
  "success": true,
  "message": "Place route fare created successfully",
  "place": {
    "_id": "660c20a49b8214a1a5b82008",
    "firstPlace": "Central Station",
    "lastPlace": "Coogee Beach",
    "fair": 45,
    "fare": 45,
    "currency": "AUD",
    "distanceKm": 9,
    "durationMin": 22,
    "vehicleType": "all",
    "isActive": true,
    "createdAt": "2026-10-08T08:00:00.000Z",
    "updatedAt": "2026-10-08T08:00:00.000Z"
  }
}
```

---

### 1.7 Update Place Route Fare
Partially updates an existing route fare.

- **Method:** `PATCH`
- **URL:** `http://localhost:4000/api/v1/places/:id`
- **Headers:** `Content-Type: application/json`

#### Demo Payload
```json
{
  "fair": 50,
  "distanceKm": 10,
  "notes": "Updated summer peak rate"
}
```

#### cURL
```bash
curl -X PATCH http://localhost:4000/api/v1/places/660c20a49b8214a1a5b82008 \
  -H "Content-Type: application/json" \
  -d '{
    "fair": 50,
    "notes": "Updated summer peak rate"
  }'
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Place route fare updated successfully",
  "place": {
    "_id": "660c20a49b8214a1a5b82008",
    "firstPlace": "Central Station",
    "lastPlace": "Coogee Beach",
    "fair": 50,
    "fare": 50,
    "notes": "Updated summer peak rate"
  }
}
```

---

### 1.8 Delete Place Route Fare
- **Method:** `DELETE`
- **URL:** `http://localhost:4000/api/v1/places/:id`

#### cURL
```bash
curl -X DELETE http://localhost:4000/api/v1/places/660c20a49b8214a1a5b82008
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Place route with ID '660c20a49b8214a1a5b82008' deleted successfully"
}
```

---

## 2. Vehicles Fleet Catalog (`/vehicles`)

Manage vehicles available for taxi, airport transfer, and chauffeur services.

---

### 2.1 Seed Default Vehicles
Seeds standard fleet options (`taxi`, `executive`, `luxury`, `suv`, `mpv`, `van`).

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/vehicles/seed`
- **Body:** None

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/vehicles/seed \
  -H "Content-Type: application/json"
```

#### Expected Response (`201 Created`)
```json
{
  "count": 6,
  "vehicles": [
    {
      "name": "Taxi",
      "slug": "taxi",
      "group": "Sedan",
      "description": "Everyday affordable rides across Sydney with meter/fixed rates.",
      "supportedServices": ["taxi"],
      "passengersMin": 1,
      "passengersMax": 4,
      "luggage": 2,
      "basePrice": 4500,
      "pricePerKm": 250,
      "pricePerMinute": 80,
      "minimumFare": 3000,
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

---

### 2.2 List Vehicles
- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/vehicles`
- **Query Parameters (Optional):**
  - `service` (string): `taxi` | `airport` | `chauffeur`
  - `pax` (number): minimum passenger capacity (e.g. `4`)
  - `isActive` (boolean): `true` | `false`

#### Example URLs
- `http://localhost:4000/api/v1/vehicles`
- `http://localhost:4000/api/v1/vehicles?service=airport&pax=3`

#### cURL
```bash
curl -X GET "http://localhost:4000/api/v1/vehicles?service=airport"
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "count": 4,
  "vehicles": [
    {
      "_id": "660c18a28f8214a1a5b81001",
      "name": "Executive Sedan",
      "slug": "executive",
      "group": "Sedan",
      "passengersMin": 1,
      "passengersMax": 4,
      "luggage": 3,
      "basePrice": 8500,
      "pricePerKm": 320,
      "isActive": true
    }
  ]
}
```

---

### 2.3 Get Vehicle by Slug or ID
Supports lookup by URL slug (e.g. `taxi`, `luxury`) or MongoDB ObjectId.

- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/vehicles/:idOrSlug`

#### Example URLs
- `http://localhost:4000/api/v1/vehicles/taxi`
- `http://localhost:4000/api/v1/vehicles/660c18a28f8214a1a5b81001`

#### cURL
```bash
curl -X GET http://localhost:4000/api/v1/vehicles/taxi
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "vehicle": {
    "_id": "660c18a28f8214a1a5b81001",
    "name": "Taxi",
    "slug": "taxi",
    "passengersMax": 4,
    "luggage": 2,
    "basePrice": 4500
  }
}
```

---

### 2.4 Create New Vehicle
- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/vehicles`
- **Headers:** `Content-Type: application/json`

#### Demo Payload
```json
{
  "name": "Electric Premium Sedan",
  "slug": "tesla-model-y",
  "group": "EV Premium",
  "description": "Zero emissions quiet transfer in a modern Tesla Model Y.",
  "supportedServices": ["taxi", "airport", "chauffeur"],
  "passengersMin": 1,
  "passengersMax": 4,
  "luggage": 3,
  "features": ["Zero Emissions", "Quiet Ride", "USB-C Fast Charging", "Glass Roof"],
  "exampleModels": ["Tesla Model Y Long Range"],
  "image": "/fleet/ev-tesla.png",
  "basePrice": 6500,
  "pricePerKm": 290,
  "pricePerMinute": 95,
  "minimumFare": 5000,
  "isActive": true,
  "sortOrder": 4
}
```

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Electric Premium Sedan",
    "slug": "tesla-model-y",
    "passengersMax": 4,
    "basePrice": 6500,
    "pricePerKm": 290
  }'
```

#### Expected Response (`201 Created`)
```json
{
  "success": true,
  "message": "Vehicle created successfully",
  "vehicle": {
    "_id": "660c23e89b8214a1a5b82015",
    "name": "Electric Premium Sedan",
    "slug": "tesla-model-y",
    "passengersMax": 4,
    "basePrice": 6500,
    "isActive": true
  }
}
```

---

### 2.5 Update Vehicle
- **Method:** `PATCH`
- **URL:** `http://localhost:4000/api/v1/vehicles/:id`
- **Headers:** `Content-Type: application/json`

#### Demo Payload
```json
{
  "basePrice": 7000,
  "pricePerKm": 310,
  "isActive": true
}
```

#### cURL
```bash
curl -X PATCH http://localhost:4000/api/v1/vehicles/660c23e89b8214a1a5b82015 \
  -H "Content-Type: application/json" \
  -d '{ "basePrice": 7000 }'
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "vehicle": {
    "_id": "660c23e89b8214a1a5b82015",
    "basePrice": 7000
  }
}
```

---

### 2.6 Delete Vehicle
- **Method:** `DELETE`
- **URL:** `http://localhost:4000/api/v1/vehicles/:id`

#### cURL
```bash
curl -X DELETE http://localhost:4000/api/v1/vehicles/660c23e89b8214a1a5b82015
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vehicle 660c23e89b8214a1a5b82015 deleted successfully"
}
```

---

## 3. Bookings Management (`/bookings`)

End-to-end guest booking system with automated human-readable reference codes (e.g. `SYD-K9J4M2`). No login required.

---

### 3.1 Create Guest Booking
Creates a confirmed guest ride reservation.

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/bookings`
- **Headers:** `Content-Type: application/json`

#### Demo Payload 1: Airport Transfer Booking (Full Payload)
```json
{
  "service": "airport",
  "from": {
    "name": "Sydney Kingsford Smith Airport T1",
    "address": "Airport Dr, Mascot NSW 2020",
    "lat": -33.9399,
    "lng": 151.1753,
    "code": "SYD",
    "type": "airport"
  },
  "to": {
    "name": "Four Seasons Hotel Sydney",
    "address": "199 George St, The Rocks NSW 2000",
    "lat": -33.8617,
    "lng": 151.2084,
    "type": "hotel"
  },
  "isNow": false,
  "when": "2026-10-15T08:30:00.000Z",
  "pax": 2,
  "vehicleType": "executive",
  "passengerName": "Sarah Jenkins",
  "passengerPhone": "0412345678",
  "passengerEmail": "sarah.jenkins@example.com",
  "flightNumber": "QF12",
  "airportTripType": "pickup",
  "notes": "Meet inside arrivals with name sign please.",
  "fare": {
    "currency": "AUD",
    "total": 95,
    "gstIncluded": 8.64,
    "distanceKm": 14.5,
    "durationMin": 28,
    "lines": [
      { "label": "Base Route Fare", "amount": 85 },
      { "label": "Airport Toll / Access", "amount": 10 }
    ]
  }
}
```

#### Demo Payload 2: Immediate Local Taxi Booking (Quick Payload)
```json
{
  "service": "taxi",
  "isNow": true,
  "from": {
    "name": "Circular Quay Wharf 4",
    "address": "Circular Quay, Sydney NSW 2000",
    "lat": -33.8614,
    "lng": 151.2108
  },
  "to": {
    "name": "Bondi Beach Pavilion",
    "address": "Queen Elizabeth Dr, Bondi Beach NSW 2026",
    "lat": -33.8915,
    "lng": 151.2767
  },
  "pax": 3,
  "vehicleType": "taxi",
  "passengerName": "David Miller",
  "passengerPhone": "0498765432"
}
```

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "service": "airport",
    "isNow": true,
    "from": {
      "name": "Sydney Airport T1",
      "lat": -33.9399,
      "lng": 151.1753
    },
    "to": {
      "name": "Sydney CBD",
      "lat": -33.8688,
      "lng": 151.2093
    },
    "pax": 2,
    "vehicleType": "taxi",
    "passengerName": "David Miller",
    "passengerPhone": "0498765432"
  }'
```

#### Expected Response (`201 Created`)
```json
{
  "success": true,
  "message": "Booking confirmed successfully",
  "booking": {
    "id": "660c28e99b8214a1a5b82030",
    "number": "SYD-A9K4F2",
    "status": "confirmed",
    "service": "airport",
    "vehicleType": "taxi",
    "pickup": {
      "name": "Sydney Airport T1",
      "address": "",
      "lat": -33.9399,
      "lng": 151.1753
    },
    "destination": {
      "name": "Sydney CBD",
      "address": "",
      "lat": -33.8688,
      "lng": 151.2093
    },
    "pickupAt": null,
    "isNow": true,
    "passengers": 2,
    "passengerName": "David Miller",
    "passengerPhone": "0498765432",
    "createdAt": "2026-10-08T08:15:00.000Z"
  }
}
```

---

### 3.2 List Bookings
Lists paginated bookings with optional search filters.

- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/bookings`
- **Query Parameters (Optional):**
  - `phone` (string) — Search by passenger phone number
  - `status` (`pending` | `confirmed` | `assigned` | `in_progress` | `completed` | `cancelled`)
  - `service` (`taxi` | `airport` | `chauffeur`)
  - `limit` (number, default: `20`)
  - `skip` (number, default: `0`)

#### Example URLs
- `http://localhost:4000/api/v1/bookings`
- `http://localhost:4000/api/v1/bookings?phone=0498765432`
- `http://localhost:4000/api/v1/bookings?status=confirmed&service=airport`

#### cURL
```bash
curl -X GET "http://localhost:4000/api/v1/bookings?limit=10"
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "total": 1,
  "bookings": [
    {
      "_id": "660c28e99b8214a1a5b82030",
      "bookingNumber": "SYD-A9K4F2",
      "service": "airport",
      "status": "confirmed",
      "passengerName": "David Miller",
      "passengerPhone": "0498765432",
      "vehicleType": "taxi"
    }
  ]
}
```

---

### 3.3 Lookup Booking by Reference or ID
Retrieve a booking using either the reference string (e.g. `SYD-A9K4F2`) or the MongoDB `_id`.

- **Method:** `GET`
- **URL:** `http://localhost:4000/api/v1/bookings/:refOrId`

#### Example URLs
- `http://localhost:4000/api/v1/bookings/SYD-A9K4F2`
- `http://localhost:4000/api/v1/bookings/660c28e99b8214a1a5b82030`

#### cURL
```bash
curl -X GET http://localhost:4000/api/v1/bookings/SYD-A9K4F2
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "booking": {
    "_id": "660c28e99b8214a1a5b82030",
    "bookingNumber": "SYD-A9K4F2",
    "status": "confirmed",
    "service": "airport",
    "vehicleType": "taxi",
    "passengerName": "David Miller",
    "passengerPhone": "0498765432",
    "isNow": true,
    "pickup": {
      "name": "Sydney Airport T1",
      "lat": -33.9399,
      "lng": 151.1753
    },
    "destination": {
      "name": "Sydney CBD",
      "lat": -33.8688,
      "lng": 151.2093
    }
  }
}
```

---

### 3.4 Update Booking Status
Admin or driver status updates (e.g. dispatch assignment, in progress, completed, payment update).

- **Method:** `PATCH`
- **URL:** `http://localhost:4000/api/v1/bookings/:refOrId/status`
- **Headers:** `Content-Type: application/json`

#### Allowed Status Values
- `status`: `'pending'` | `'confirmed'` | `'assigned'` | `'in_progress'` | `'completed'` | `'cancelled'`
- `paymentStatus`: `'pending'` | `'paid'` | `'cash_to_driver'` | `'card'`

#### Demo Payload
```json
{
  "status": "assigned",
  "paymentStatus": "paid",
  "notes": "Driver Robert assigned - White Camry Rego ABC-123"
}
```

#### cURL
```bash
curl -X PATCH http://localhost:4000/api/v1/bookings/SYD-A9K4F2/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "assigned",
    "paymentStatus": "paid",
    "notes": "Driver Robert assigned"
  }'
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Booking status updated successfully",
  "booking": {
    "_id": "660c28e99b8214a1a5b82030",
    "bookingNumber": "SYD-A9K4F2",
    "status": "assigned",
    "paymentStatus": "paid",
    "notes": "Driver Robert assigned"
  }
}
```

---

### 3.5 Cancel Booking
Cancels a booking and records a cancellation reason.

- **Method:** `POST`
- **URL:** `http://localhost:4000/api/v1/bookings/:refOrId/cancel`
- **Headers:** `Content-Type: application/json`

#### Demo Payload
```json
{
  "reason": "Flight rescheduled to next day"
}
```

#### cURL
```bash
curl -X POST http://localhost:4000/api/v1/bookings/SYD-A9K4F2/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Flight rescheduled to next day"
  }'
```

#### Expected Response (`200 OK`)
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "booking": {
    "_id": "660c28e99b8214a1a5b82030",
    "bookingNumber": "SYD-A9K4F2",
    "status": "cancelled",
    "cancellationReason": "Flight rescheduled to next day"
  }
}
```
