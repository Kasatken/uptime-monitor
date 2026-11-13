import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module.js';
import { ChecksModule } from './checks/checks.module.js';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EventsModule } from './events/events.module.js';
import { HealthModule } from './health/health.module.js';
import { IncidentsModule } from './incidents/incidents.module.js';
import { InsightsModule } from './insights/insights.module.js';
import { MonitorsModule } from './monitors/monitors.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { SchedulerModule } from './scheduler/scheduler.module.js';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    EventsModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),

    AuthModule,
    MonitorsModule,
    ChecksModule,
    SchedulerModule,
    IncidentsModule,
    NotificationsModule,
    InsightsModule,
    RealtimeModule,
    HealthModule,
  ],
})
export class AppModule {}
