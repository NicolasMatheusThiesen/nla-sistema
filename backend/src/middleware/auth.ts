import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    empresa_id: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // ── MODO DESENVOLVIMENTO LOCAL ──────────────────────────────
    // Controlado pela variável DEV_BYPASS_AUTH=true no .env
    // Em produção (Render), esta variável NÃO existe → auth real obrigatória
    if (env.DEV_BYPASS_AUTH === 'true' && env.NODE_ENV !== 'production') {
      req.user = {
        id: 'dev-user-id',
        email: 'admin@nla.com.br',
        empresa_id: env.DEV_EMPRESA_ID || 'a0000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      logger.debug('⚠️  DEV_BYPASS_AUTH ativo — autenticação desabilitada (apenas local)');
      return next();
    }

    // ── AUTENTICAÇÃO REAL (PRODUÇÃO) ────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn(`Tentativa de acesso com token inválido: ${authError?.message}`);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('empresa_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn(`Perfil não encontrado para o usuário: ${user.id}`);
      return res.status(403).json({ error: 'Perfil de usuário não configurado. Contate o administrador.' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      empresa_id: profile.empresa_id,
      role: profile.role,
    };

    next();
  } catch (err) {
    logger.error('Erro no middleware de autenticação:', err);
    return res.status(500).json({ error: 'Erro interno de autenticação' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
};
