import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const vendedorSchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  telefone: z.string().optional(),
  percentual_comissao_padrao: z.coerce.number().min(0).max(100).default(0),
  ativo: z.boolean().default(true),
});

// GET /api/vendedores
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { ativo } = req.query;

    let query = supabase
      .from('vendedores')
      .select('*')
      .eq('empresa_id', empresa_id)
      .order('nome');

    if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar vendedores' });
  }
});

// GET /api/vendedores/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data: vendedor, error } = await supabase
      .from('vendedores')
      .select('*')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error || !vendedor) return res.status(404).json({ error: 'Vendedor nÃ£o encontrado' });

    // Buscar comissÃµes geradas
    const [vendasResult, contratosResult] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, valor_venda, valor_comissao, percentual_comissao, data_venda, clientes(razao_social), maquinas(nome)')
        .eq('vendedor_id', id)
        .eq('empresa_id', empresa_id)
        .order('data_venda', { ascending: false }),
      supabase
        .from('contratos')
        .select('id, numero, valor_mensal, valor_comissao, percentual_comissao, data_inicio, clientes(razao_social)')
        .eq('vendedor_id', id)
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false }),
    ]);

    const totalComissaoVendas = vendasResult.data?.reduce((s, v) => s + (v.valor_comissao || 0), 0) || 0;
    const totalComissaoContratos = contratosResult.data?.reduce((s, c) => s + (c.valor_comissao || 0), 0) || 0;

    res.json({
      ...vendedor,
      vendas: vendasResult.data || [],
      contratos: contratosResult.data || [],
      total_comissao_vendas: totalComissaoVendas,
      total_comissao_contratos: totalComissaoContratos,
      total_comissao: totalComissaoVendas + totalComissaoContratos,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar vendedor' });
  }
});

// POST /api/vendedores
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = vendedorSchema.parse(req.body);

    const { data, error } = await supabase
      .from('vendedores')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar vendedor' });
  }
});

// PUT /api/vendedores/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = vendedorSchema.partial().parse(req.body);

    const { data, error } = await supabase
      .from('vendedores')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar vendedor' });
  }
});

// DELETE /api/vendedores/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Soft delete
    await supabase
      .from('vendedores')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    res.json({ message: 'Vendedor desativado' });
  } catch {
    res.status(500).json({ error: 'Erro ao desativar vendedor' });
  }
});

export default router;
