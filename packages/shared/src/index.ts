import { z } from 'zod';

// Side effect on purpose: API and web share this zod instance, so every
// message without a custom text falls back to Russian.
z.config(z.locales.ru());

export * from './check.js';
export * from './format.js';
export * from './incident.js';
export * from './live.js';
export * from './monitor.js';
export * from './status-page.js';
