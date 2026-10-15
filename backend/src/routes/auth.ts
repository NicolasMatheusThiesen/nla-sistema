import { Router, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { authRateLimit } from '../middleware/rateLimit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

const supabaseAuth = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /api/auth/login (Protegido por rate limit anti-brute force)
router.post('/login', authRateLimit, async (req, res: Response) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.warn(`[AUTH] Tentativa de login falhou para email ${email} a partir do IP ${clientIp}: ${error.message}`);
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique email e senha.' });
    }

    logger.info(`[AUTH] Login bem-sucedido para usuário ${data.user?.id} (${email}) a partir do IP ${clientIp}`);

    // Retorna a sessão (token JWT) para o frontend
    res.json({ session: data.session, user: data.user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Formato de email ou senha inválido' });
    }
    logger.error(`[AUTH] Erro interno durante tentativa de login de IP ${clientIp}:`, err);
    res.status(500).json({ error: 'Erro no servidor durante autenticação' });
  }
});

// GET /api/auth/me (Retorna dados do usuário autenticado e perfil)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      user: req.user,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

export default router;
