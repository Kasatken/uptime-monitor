import { All, Controller, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator.js';
import { MonitorsRepository } from '../monitors/monitors.repository.js';
import { CheckRunner } from './check-runner.service.js';

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
    if (!monitor) throw new NotFoundException('Неизвестный токен');

    await this.monitors.update(monitor.id, { lastHeartbeatAt: new Date() });

    if (monitor.status === 'down' || monitor.status === 'pending') {
      void this.runner.run(monitor.id);
    }
    return { ok: true };
  }
}
