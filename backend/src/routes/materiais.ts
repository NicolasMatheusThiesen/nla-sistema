import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const materialSchema = z.object({
  nome: z.string().min(1),
  finalidade: z.enum(['consumo', 'manutencao', 'revenda', 'multiplo']),
  unidade_medida: z.string().optional().default('un'),
  custo_unitario: z.number().min(0).default(0),
  valor_venda: z.number().min(0).default(0),
  quantidade_estoque: z.number().min(0).default(0),
  observacoes: z.string().optional().transform(v => v === '' ? undefined : v),
  ativo: z.boolean().optional().default(true),
});

// GET /api/materiais
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { search, finalidade } = req.query;

    let query = supabase
      .from('materiais')
      .select('*')
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('nome');

    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }
    if (finalidade) {
      query = query.eq('finalidade', finalidade as string);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar materiais' });
  }
});

// GET /api/materiais/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('materiais')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Material não encontrado' });
    
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
});

// POST /api/materiais
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = materialSchema.parse(req.body);

    const { data, error } = await supabase
      .from('materiais')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar material' });
  }
});

// PUT /api/materiais/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = materialSchema.partial().parse(req.body);

    const { data, error } = await supabase
      .from('materiais')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Material não encontrado' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar material' });
  }
});

// DELETE /api/materiais/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { error } = await supabase
      .from('materiais')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'Material removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover material' });
  }
});

export default router;
