import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationLog, NotificationLogSchema } from './notification-log.schema.js';

@Module({
  imports: [
    // Registers the NotificationLog schema in the current module's scope.
    // This allows us to inject the NotificationLogModel into services for saving audit logs.
    MongooseModule.forFeature([{ name: NotificationLog.name, schema: NotificationLogSchema }]),
    
    // ARCHITECTURE NOTE:
    // In an event-driven architecture, this module should eventually import a Message Queue 
    // module (like BullMQ). The flow would be:
    // 1. App emits 'BOOKING_CONFIRMED' event.
    // 2. NotificationService receives it, saves a PENDING NotificationLog.
    // 3. Service pushes a job to BullMQ for asynchronous processing.
    // 4. A worker processes the job, sends the SMS/Push via an external API.
    // 5. Worker updates the NotificationLog status to SENT/DELIVERED or FAILED.
  ],
  providers: [],
  controllers: [],
  exports: [
    MongooseModule,
  ],
})
export class NotificationModule {}
