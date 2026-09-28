import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter } from './server/routes/auth';
import { apiRouter } from './server/routes/api';
import { healthRouter } from './server/routes/health';
import { realtimeHub } from './server/realtime/hub';
import { checkDatabaseConnection } from './src/db/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Request ID & Logging Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = crypto.randomUUID().slice(0, 8);
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.path.startsWith('/api/events')) {
        console.log(`[REQ ${req.requestId}] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });

    next();
  });

  // Verify database connectivity at startup
  const dbHealth = await checkDatabaseConnection();
  if (!dbHealth.healthy) {
    console.error('CAREGRID Startup Warning: Initial PostgreSQL check failed:', dbHealth.error);
  } else {
    console.log(`CAREGRID Database Connected: PostgreSQL operational (latency: ${dbHealth.latencyMs}ms)`);
  }

  // SSE Realtime Endpoint
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = crypto.randomUUID().slice(0, 8);
    realtimeHub.addClient(clientId, res);

    req.on('close', () => {
      realtimeHub.removeClient(clientId);
    });
  });

  // API Routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api', apiRouter);

  // Vite middleware in development vs static files in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, () => {
    console.log(`CAREGRID Operations Console listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nGracefully shutting down CAREGRID server...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
