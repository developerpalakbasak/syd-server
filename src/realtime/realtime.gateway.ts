import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Realtime client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Realtime client disconnected: ${client.id}`);
  }

  /**
   * Guest passengers join the booking room using their tracking token (no user account needed).
   */
  @SubscribeMessage('join.tracking')
  async handleJoinTracking(
    @MessageBody() data: { bookingId: string; trackingToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.bookingId) {
      await client.join(`booking_${data.bookingId}`);
      client.emit('tracking.joined', {
        success: true,
        bookingId: data.bookingId,
        message: 'Successfully subscribed to booking live updates',
      });
    }
  }

  /**
   * Authenticated drivers join their dedicated driver room.
   */
  @SubscribeMessage('join.driver')
  async handleJoinDriver(
    @MessageBody() data: { driverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (data?.driverId) {
      await client.join(`driver_${data.driverId}`);
      client.emit('driver.joined', { success: true, driverId: data.driverId });
    }
  }

  /**
   * Drivers stream their real-time GPS coordinates.
   * Server forwards this directly to the guest passenger in room `booking_${bookingId}`.
   */
  @SubscribeMessage('driver.location')
  handleDriverLocation(
    @MessageBody()
    data: {
      bookingId: string;
      coordinates: [number, number]; // [longitude, latitude]
      heading?: number;
      speed?: number;
    },
    @ConnectedSocket() _client: Socket,
  ) {
    if (data?.bookingId && data?.coordinates) {
      this.server.to(`booking_${data.bookingId}`).emit('location.update', {
        bookingId: data.bookingId,
        coordinates: data.coordinates,
        heading: data.heading,
        speed: data.speed,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Helper function to broadcast booking state changes to connected guests and drivers.
   */
  broadcastBookingStatusChange(bookingId: string, status: string, payload?: Record<string, any>) {
    this.server.to(`booking_${bookingId}`).emit('booking.status_changed', {
      bookingId,
      status,
      timestamp: new Date(),
      ...payload,
    });
  }
}
