import { All, Controller, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { CheckRunner } from './check-runner.service.js';

/**
 * Ping endpoint for heartbeat monitors. Accepts any method so it works with
 * `curl`, `wget`, and services that can only send GET or only POST.
 *
 *   0 3 * * *  /backup.sh && curl -fsS https://status.example.com/api/heartbeat/<token>
 */
@Public()
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('heartbeat')
export class HeartbeatController {
  constructor(
    private readonly monitors: MonitorsRepository,
    private readonly runner: CheckRunner,
  ) {}

  @All(':token')
  async ping(@Param('token') token: string) {
    const monitor = await this.monitors.findByHeartbeatToken(token);
    if (!monitor) throw new NotFoundException('Unknown heartbeat token');

    await this.monitors.update(monitor.id, { lastHeartbeatAt: new Date() });

    // Don't wait for the next scheduled tick to show the recovery
    if (monitor.status === 'down' || monitor.status === 'pending') {
      void this.runner.run(monitor.id);
    }
    return { ok: true };
  }
}
