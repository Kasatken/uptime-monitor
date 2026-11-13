import { Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { MonitorsModule } from '../monitors/monitors.module.js';
import { CheckRunner } from './check-runner.service.js';
import { CheckerRegistry } from './checkers/checker.registry.js';
import { HeartbeatChecker } from './checkers/heartbeat.checker.js';
import { HttpChecker } from './checkers/http.checker.js';
import { TcpChecker } from './checkers/tcp.checker.js';
import { TlsCertificateProbe } from './checkers/tls-certificate.probe.js';
import { ChecksController } from './checks.controller.js';
import { ChecksRepository } from './checks.repository.js';
import { HeartbeatController } from './heartbeat.controller.js';
import { RetentionService } from './retention.service.js';

@Module({
  imports: [DiscoveryModule, MonitorsModule],
  controllers: [ChecksController, HeartbeatController],
  providers: [
    HttpChecker,
    TcpChecker,
    HeartbeatChecker,
    TlsCertificateProbe,
    CheckerRegistry,
    ChecksRepository,
    CheckRunner,
    RetentionService,
  ],
  exports: [ChecksRepository, CheckRunner],
})
export class ChecksModule {}
