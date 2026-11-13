import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { MonitorType } from '@vigil/shared';
import { type Checker, MonitorChecker } from './checker.js';

@Injectable()
export class CheckerRegistry implements OnModuleInit {
  private readonly logger = new Logger(CheckerRegistry.name);
  private readonly checkers = new Map<MonitorType, Checker>();

  constructor(private readonly discovery: DiscoveryService) {}

  onModuleInit() {
    const providers = this.discovery.getProviders({ metadataKey: MonitorChecker.KEY });

    for (const wrapper of providers) {
      const type = this.discovery.getMetadataByDecorator(MonitorChecker, wrapper);
      if (!type || !wrapper.instance) continue;
      if (this.checkers.has(type)) throw new Error(`Two checkers registered for "${type}"`);
      this.checkers.set(type, wrapper.instance as Checker);
    }

    this.logger.log(`Checkers: ${[...this.checkers.keys()].join(', ')}`);
  }

  get(type: MonitorType): Checker {
    const checker = this.checkers.get(type);
    if (!checker) throw new Error(`No checker registered for monitor type "${type}"`);
    return checker;
  }
}
