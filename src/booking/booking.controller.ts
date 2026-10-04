import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';

/**
 * @Controller specifies the base route path 'bookings'.
 * version: '1' enables API versioning. This means the actual route will be /v1/bookings.
 * This is crucial for scalability, allowing you to introduce breaking changes in v2 
 * without affecting older mobile app clients.
 */
@Controller({ path: 'bookings', version: '1' })
@UseGuards(RolesGuard) // Applies the RolesGuard to all routes in this controller.
export class BookingController {
  
  @Post()
  @Roles('CUSTOMER', 'PARTNER')
  createBooking() {
    // Logic to create a booking
  }

  @Get()
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  listBookings() {
    // Logic to return a list of bookings filtered by the user's role and ID
  }

  @Get(':id')
  // No specific Roles decorator implies any authenticated user can attempt access.
  // We would typically verify in the service layer if the user owns this specific booking.
  viewBooking(@Param('id') id: string) {
    // Logic to view a single booking
  }

  @Post(':id/cancel')
  @Roles('CUSTOMER', 'ADMIN')
  cancelBooking(@Param('id') id: string) {
    // Logic to cancel the booking
  }

  @Post(':id/assign')
  @Roles('ADMIN')
  assignDriver(@Param('id') id: string) {
    // Logic to manually assign a driver (usually for Admin override)
  }
}
