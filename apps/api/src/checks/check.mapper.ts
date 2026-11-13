import type { CheckDto } from '@vigil/shared';
import type { CheckRecord } from '../database/schema.js';

export const toCheckDto = (record: CheckRecord): CheckDto => ({
  id: record.id,
  monitorId: record.monitorId,
  status: record.status,
  responseMs: record.responseMs,
  statusCode: record.statusCode,
  message: record.message,
  checkedAt: record.checkedAt.toISOString(),
});
