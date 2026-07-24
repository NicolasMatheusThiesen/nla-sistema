import { Router, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

const router = Router();

// Criamos um client especÃ­fico para autenticaÃ§Ã£o com a chave ANON (ou service role se configurado, mas para signInWithPassword a ANON serve)
// O importante Ã© que isso agora ocorre no lado do servidor, escondendo as chaves do frontend.
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

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Retorna a sessÃ£o (token JWT) para o frontend
    res.json({ session: data.session, user: data.user });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Dados invÃ¡lidos' });
    }
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

export default router;
