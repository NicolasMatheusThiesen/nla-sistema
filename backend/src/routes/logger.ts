import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const rawBody = req.body;
    // Sanitização de tamanho e tipo
    const sanitizedError = {
      message: typeof rawBody?.message === 'string' ? rawBody.message.slice(0, 500) : 'Erro desconhecido',
      url: typeof rawBody?.url === 'string' ? rawBody.url.slice(0, 200) : undefined,
      status: typeof rawBody?.status === 'number' ? rawBody.status : undefined,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.socket.remoteAddress,
    };

    logger.warn(`[FRONTEND_ERROR] ${sanitizedError.message}`, sanitizedError);
    res.status(200).json({ received: true });
  } catch {
    res.status(400).json({ error: 'Payload de log inválido' });
  }
});

export default router;
