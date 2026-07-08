import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const tipoEquipamentoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullish().or(z.literal('')),
  ativo: z.boolean().optional().default(true),
});

// GET /api/tipos-equipamento
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { search } = req.query;

    let query = supabase
      .from('tipos_equipamento')
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
    res.status(500).json({ error: 'Erro ao listar tipos de equipamento' });
  }
});

// GET /api/tipos-equipamento/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tipos_equipamento')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Tipo de equipamento não encontrado' });
    
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar tipo de equipamento' });
  }
});

// POST /api/tipos-equipamento
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = tipoEquipamentoSchema.parse(req.body);
    if (body.descricao === '') body.descricao = null;

    const { data, error } = await supabase
      .from('tipos_equipamento')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('ERRO SUPABASE TIPO EQUIPAMENTO:', err);
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar tipo de equipamento' });
  }
});

// PUT /api/tipos-equipamento/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = tipoEquipamentoSchema.partial().parse(req.body);
    if (body.descricao === '') body.descricao = null;

    const { data, error } = await supabase
      .from('tipos_equipamento')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Tipo de equipamento não encontrado' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar tipo de equipamento' });
  }
});

// DELETE /api/tipos-equipamento/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { error } = await supabase
      .from('tipos_equipamento')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'Tipo de equipamento removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover tipo de equipamento' });
  }
});

export default router;
