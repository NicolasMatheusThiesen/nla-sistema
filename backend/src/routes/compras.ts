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
  conta_bancaria_id: z.string().uuid().nullish().or(z.literal('')),
  numero_parcelas: z.coerce.number().int().min(1).default(1),
  forma_pagamento: z.string().nullish().or(z.literal('')),
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
    if (body.conta_bancaria_id === '') body.conta_bancaria_id = null;

    const parcelasCount = body.numero_parcelas || 1;
    const valorParcelaBase = Math.floor((body.valor_total / parcelasCount) * 100) / 100;
    const diferencaCentavos = Math.round((body.valor_total - (valorParcelaBase * parcelasCount)) * 100) / 100;

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
        nota_fiscal: body.nota_fiscal || null,
        observacoes: body.observacoes || null,
        numero_parcelas: parcelasCount,
        forma_pagamento: body.forma_pagamento || (parcelasCount > 1 ? 'parcelado' : 'a_vista'),
      })
      .select('*, materiais(nome)')
      .single();

    if (compraError || !compra) throw compraError;

    // Gerar lancamentos de despesa (1 ou N parcelas)
    const baseDate = new Date(body.data_compra + 'T12:00:00');
    const lancamentosRecords = [];

    for (let i = 1; i <= parcelasCount; i++) {
      const dataVenc = new Date(baseDate);
      if (i > 1) {
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
      }
      const dataVencStr = dataVenc.toISOString().split('T')[0];
      const valorFinalParcela = (i === parcelasCount) ? Number((valorParcelaBase + diferencaCentavos).toFixed(2)) : valorParcelaBase;

      lancamentosRecords.push({
        empresa_id,
        tipo: 'despesa',
        descricao: parcelasCount > 1 ? `Compra: ${body.descricao} (${i}/${parcelasCount})` : `Compra: ${body.descricao}`,
        fornecedor_id: body.fornecedor_id,
        valor: valorFinalParcela,
        data_competencia: body.data_compra,
        data_vencimento: dataVencStr,
        status: (parcelasCount === 1) ? 'pago' : 'pendente', // À vista assume pago; parcelado cria parcelas pendentes
        data_pagamento: (parcelasCount === 1) ? body.data_compra : null,
        conta_bancaria_id: body.conta_bancaria_id || null,
        forma_pagamento: body.forma_pagamento || null,
        compra_id: compra.id,
        numero_parcela: i,
        total_parcelas: parcelasCount,
        observacoes: body.observacoes || null,
      });
    }

    const { data: createdLancamentos, error: lancError } = await supabase
      .from('lancamentos')
      .insert(lancamentosRecords)
      .select('id');

    if (lancError) throw lancError;

    // Vincula o primeiro lancamento_id à compra para manter compatibilidade
    if (createdLancamentos && createdLancamentos.length > 0) {
      await supabase
        .from('compras')
        .update({ lancamento_id: createdLancamentos[0].id })
        .eq('id', compra.id);
      compra.lancamento_id = createdLancamentos[0].id;
    }

    // Se for para revenda, incrementar estoque do material
    if (body.finalidade === 'revenda' && body.material_id) {
      const { data: mat } = await supabase.from('materiais').select('quantidade_estoque').eq('id', body.material_id).single();
      if (mat) {
        await supabase.from('materiais').update({
          quantidade_estoque: (mat.quantidade_estoque || 0) + body.quantidade,
        }).eq('id', body.material_id);
      }
    }

    res.status(201).json({ ...compra, parcelas_geradas: parcelasCount });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    res.status(500).json({ error: 'Erro ao registrar compra' });
  }
});

// PUT /api/compras/:id
router.put('/:id', authenticate, requireRole('admin', 'financeiro', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = compraSchema.partial().parse(req.body);

    if (body.material_id === '') body.material_id = null;
    if (body.fornecedor_id === '') body.fornecedor_id = null;
    if (body.conta_bancaria_id === '') body.conta_bancaria_id = null;

    const { data: compra, error } = await supabase
      .from('compras')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select('*, materiais(nome)')
      .single();

    if (error) throw error;
    if (!compra) return res.status(404).json({ error: 'Compra não encontrada' });

    // Atualiza lançamentos associados se houver alteração de descrição ou observações
    if (body.descricao || body.fornecedor_id) {
      await supabase
        .from('lancamentos')
        .update({
          fornecedor_id: body.fornecedor_id,
        })
        .eq('compra_id', id)
        .eq('empresa_id', empresa_id);
    }

    res.json(compra);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    res.status(500).json({ error: 'Erro ao atualizar compra' });
  }
});

// DELETE /api/compras/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Localizar compra e lançamentos vinculados
    const { data: compra } = await supabase.from('compras').select('lancamento_id').eq('id', id).single();

    // Exclui todos os lançamentos vinculados à compra
    await supabase.from('lancamentos').delete().eq('compra_id', id).eq('empresa_id', empresa_id);
    if (compra?.lancamento_id) {
      await supabase.from('lancamentos').delete().eq('id', compra.lancamento_id).eq('empresa_id', empresa_id);
    }

    const { error } = await supabase.from('compras').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;

    res.json({ message: 'Compra e parcelas financeiras removidas com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover compra' });
  }
});

export default router;
