import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const servicoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().transform(v => v === '' ? undefined : v),
  valor_padrao: z.coerce.number().min(0).default(0),
  ativo: z.boolean().optional().default(true),
});

// GET /api/servicos
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { search } = req.query;

    let query = supabase
      .from('servicos')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('nome');

    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar serviÃ§os' });
  }
});

// GET /api/servicos/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('servicos')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'ServiÃ§o nÃ£o encontrado' });
    
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar serviÃ§o' });
  }
});

// POST /api/servicos
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = servicoSchema.parse(req.body);

    const { data, error } = await supabase
      .from('servicos')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar serviÃ§o' });
  }
});

// PUT /api/servicos/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = servicoSchema.partial().parse(req.body);

    const { data, error } = await supabase
      .from('servicos')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'ServiÃ§o nÃ£o encontrado' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar serviÃ§o' });
  }
});

// DELETE /api/servicos/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { error } = await supabase
      .from('servicos')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'ServiÃ§o removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover serviÃ§o' });
  }
});

export default router;
