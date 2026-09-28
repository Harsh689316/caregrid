import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../../src/db/index';
import { realtimeHub } from '../realtime/hub';

export const healthRouter = Router();

healthRouter.get('/', async (req: Request, res: Response) => {
  const dbHealth = await checkDatabaseConnection();

  const emailConfigured = Boolean(
    process.env.GMAIL_USER?.trim() &&
    process.env.GMAIL_APP_PASSWORD?.trim(),
  );

  const smsConfigured = Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
    process.env.TWILIO_AUTH_TOKEN?.trim() &&
    process.env.TWILIO_FROM_NUMBER?.trim(),
  );

  const status = dbHealth.healthy ? 'OPERATIONAL' : 'DEGRADED';

  return res.status(dbHealth.healthy ? 200 : 503).json({
    success: true,
    status,
    timestamp: new Date().toISOString(),

    components: {
      api: {
        status: 'HEALTHY',
        uptimeSeconds: Math.floor(process.uptime()),
      },

      database: {
        status: dbHealth.healthy ? 'HEALTHY' : 'UNHEALTHY',
        latencyMs: dbHealth.latencyMs,
        error: dbHealth.error,
      },

      realtime: {
        status: 'OPERATIONAL',
        activeConnections: realtimeHub.getConnectionCount(),
      },

      analyticsEngine: {
        status: 'OPERATIONAL',
        algorithm:
          'Statistical Z-score & Weighted Moving Average Baseline',
      },

      email: {
        provider: 'GMAIL',
        status: emailConfigured
          ? 'CONFIGURED'
          : 'NOT_CONFIGURED',
        note: emailConfigured
          ? 'Gmail provider credentials configured.'
          : 'GMAIL_USER or GMAIL_APP_PASSWORD is not configured.',
      },

      sms: {
        provider: 'TWILIO',
        status: smsConfigured
          ? 'CONFIGURED'
          : 'NOT_CONFIGURED',
        note: smsConfigured
          ? 'Twilio provider credentials configured.'
          : 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_FROM_NUMBER is not configured.',
      },
    },

    requestId: req.requestId,
  });
});