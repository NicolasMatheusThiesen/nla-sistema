import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/categorias
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { tipo } = req.query;

    let query = supabase.from('categorias').select('*').eq('empresa_id', empresa_id).eq('ativo', true).order('nome');
    if (tipo) query = query.eq('tipo', tipo as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar categorias' });
  }
});

// POST /api/categorias
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { nome, tipo, cor, icone } = req.body;
    if (!nome || !tipo) return res.status(400).json({ error: 'nome e tipo são obrigatórios' });

    const { data, error } = await supabase.from('categorias').insert({ empresa_id, nome, tipo, cor, icone }).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { nome, tipo, cor, icone } = req.body;
    const { data, error } = await supabase
      .from('categorias')
      .update({ nome, tipo, cor, icone })
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// PUT /api/categorias/:id
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { nome, tipo, cor, icone } = req.body;
    const { data, error } = await supabase
      .from('categorias')
      .update({ nome, tipo, cor, icone })
      .eq('id', req.params.id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// DELETE /api/categorias/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    await supabase.from('categorias').update({ ativo: false }).eq('id', req.params.id).eq('empresa_id', empresa_id);
    res.json({ message: 'Categoria removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover categoria' });
  }
});

export default router;
