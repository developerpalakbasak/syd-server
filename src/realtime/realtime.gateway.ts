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

/**
 * @WebSocketGateway sets up a Socket.io server instance attached to the NestJS app.
 * cors: true allows cross-origin requests, typical for web/mobile client connections.
 */
@WebSocketGateway({ cors: true, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    // Typical logic here: authenticate connection via JWT token passed in headers/query,
    // and then join the socket to specific "rooms" based on their userId or bookingId.
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Clean up connections if necessary
  }

  /**
   * Listens for high-frequency GPS updates from the driver's app.
   */
  @SubscribeMessage('driver.location')
  handleDriverLocation(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    // Log the driver's location update for auditing or debugging.
    console.log(`Received location from driver:`, data);
    
    // ARCHITECTURE NOTE:
    // To broadcast this to the specific customer, you would typically:
    // 1. Identify which active booking this driver is currently servicing.
    // 2. Emit the location data to a specific "Room".
    // Example: this.server.to(`booking_${data.bookingId}`).emit('location.update', data.coordinates);
    // The customer app would have already joined `booking_${data.bookingId}` upon confirming the ride.
  }

  /**
   * Helper function that the rest of the NestJS application (like BookingService)
   * can call to push status updates to connected clients in real-time.
   */
  broadcastBookingStatusChange(bookingId: string, status: string, payload: any) {
    // Pushes the 'booking.status_changed' event to anyone subscribed to this booking's room.
    this.server.to(`booking_${bookingId}`).emit('booking.status_changed', {
      bookingId,
      status,
      ...payload,
    });
  }
}
