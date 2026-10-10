import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: { database: dbStatus }
  });
});

export default router;
