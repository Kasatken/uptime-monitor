import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DomainEvents } from './domain-events.js';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot({ wildcard: false })],
  providers: [DomainEvents],
  exports: [DomainEvents],
})
export class EventsModule {}
