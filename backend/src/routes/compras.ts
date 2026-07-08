import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const compraSchema = z.object({
  descricao: z.string().min(1),
  fornecedor_id: z.string().uuid().nullish().or(z.literal('')),
  material_id: z.string().uuid().nullish().or(z.literal('')),
  quantidade: z.coerce.number().positive().default(1),
  valor_unitario: z.coerce.number().min(0).default(0),
  valor_total: z.coerce.number().positive(),
  finalidade: z.enum(['consumo', 'revenda']),
  data_compra: z.string(),
  nota_fiscal: z.string().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
});

// GET /api/compras
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { finalidade, search } = req.query;

    let query = supabase
      .from('compras')
      .select('*, materiais(nome, unidade_medida), fornecedores(razao_social)')
      .eq('empresa_id', empresa_id)
      .order('data_compra', { ascending: false });

    if (finalidade) query = query.eq('finalidade', finalidade as string);
    if (search) query = query.ilike('descricao', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar compras' });
  }
});

// POST /api/compras
router.post('/', authenticate, requireRole('admin', 'financeiro', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = compraSchema.parse(req.body);

    if (body.material_id === '') body.material_id = null;
    if (body.fornecedor_id === '') body.fornecedor_id = null;

    // Criar lanÃ§amento de despesa no financeiro
    const { data: lanc, error: lancError } = await supabase
      .from('lancamentos')
      .insert({
        empresa_id,
        tipo: 'despesa',
        descricao: `Compra: ${body.descricao}`,
        fornecedor_id: body.fornecedor_id,
        valor: body.valor_total,
        data_competencia: body.data_compra,
        status: 'pago',
        observacoes: body.observacoes,
      })
      .select('id')
      .single();

    if (lancError || !lanc) throw lancError;

    // Criar registro de compra
    const { data: compra, error: compraError } = await supabase
      .from('compras')
      .insert({
        empresa_id,
        descricao: body.descricao,
        fornecedor_id: body.fornecedor_id || null,
        material_id: body.material_id || null,
        quantidade: body.quantidade,
        valor_unitario: body.valor_unitario,
        valor_total: body.valor_total,
        finalidade: body.finalidade,
        data_compra: body.data_compra,
        nota_fiscal: body.nota_fiscal,
        observacoes: body.observacoes,
        lancamento_id: lanc.id,
      })
      .select('*, materiais(nome)')
      .single();

    if (compraError || !compra) throw compraError;

    // Se for para revenda, incrementar estoque do material
    if (body.finalidade === 'revenda' && body.material_id) {
      const { data: mat } = await supabase.from('materiais').select('quantidade_estoque').eq('id', body.material_id).single();
      if (mat) {
        await supabase.from('materiais').update({
          quantidade_estoque: (mat.quantidade_estoque || 0) + body.quantidade,
        }).eq('id', body.material_id);
      }
    }

    res.status(201).json(compra);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// DELETE /api/compras/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    
    // Cancelar lanÃ§amento vinculado
    const { data: compra } = await supabase.from('compras').select('lancamento_id').eq('id', id).single();
    if (compra?.lancamento_id) {
      await supabase.from('lancamentos').update({ status: 'cancelado' }).eq('id', compra.lancamento_id);
    }
    
    await supabase.from('compras').delete().eq('id', id).eq('empresa_id', empresa_id);
    res.json({ message: 'Compra removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover compra' });
  }
});

export default router;
