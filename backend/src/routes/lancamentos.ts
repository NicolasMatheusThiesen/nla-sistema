import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const lancamentoSchema = z.object({
  tipo: z.enum(['receita', 'despesa']),
  categoria_id: z.string().uuid().nullish().or(z.literal('')),
  descricao: z.string().min(1),
  valor: z.number().positive(),
  data_competencia: z.string(),
  data_vencimento: z.string().nullish().or(z.literal('')),
  data_pagamento: z.string().nullish().or(z.literal('')),
  status: z.enum(['pendente', 'pago', 'vencido', 'cancelado']).default('pendente'),
  forma_pagamento: z.string().nullish().or(z.literal('')),
  cliente_id: z.string().uuid().nullish().or(z.literal('')),
  fornecedor_id: z.string().uuid().nullish().or(z.literal('')),
  maquina_id: z.string().uuid().nullish().or(z.literal('')),
  contrato_id: z.string().uuid().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
  recorrente: z.boolean().default(false),
  numero_parcelas: z.number().int().min(1).default(1),
});

// GET /api/lancamentos
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { tipo, status, mes, categoria_id, page = '1', limit = '50' } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    let query = supabase
      .from('lancamentos')
      .select(`
        *,
        categorias(nome, cor, tipo),
        clientes(razao_social),
        fornecedores(razao_social),
        maquinas(nome, modelo)
      `, { count: 'exact' })
      .eq('empresa_id', empresa_id)
      .order('data_competencia', { ascending: false })
      .range(offset, offset + parseInt(limit as string) - 1);

    if (tipo) query = query.eq('tipo', tipo as string);
    if (status) query = query.eq('status', status as string);
    if (mes) query = query.gte('data_competencia', `${mes}-01`).lte('data_competencia', `${mes}-31`);
    if (categoria_id) query = query.eq('categoria_id', categoria_id as string);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({ data, total: count, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch {
    res.status(500).json({ error: 'Erro ao listar lançamentos' });
  }
});

// GET /api/lancamentos/fluxo-caixa  — extrato consolidado
router.get('/fluxo-caixa', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { mes_inicio, mes_fim } = req.query;

    const [parcelasResult, lancamentosResult] = await Promise.all([
      supabase
        .from('parcelas')
        .select('valor, valor_pago, status, data_vencimento, data_pagamento, competencia, clientes(razao_social)')
        .eq('empresa_id', empresa_id)
        .gte('data_vencimento', `${mes_inicio || ''}-01`)
        .lte('data_vencimento', `${mes_fim || ''}-31`),
      supabase
        .from('lancamentos')
        .select('*, categorias(nome, cor)')
        .eq('empresa_id', empresa_id)
        .gte('data_competencia', `${mes_inicio || ''}-01`)
        .lte('data_competencia', `${mes_fim || ''}-31`)
        .order('data_competencia'),
    ]);

    const totalReceitas = parcelasResult.data?.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor_pago || p.valor), 0) || 0;
    const totalReceitasPendentes = parcelasResult.data?.filter(p => p.status === 'pendente').reduce((s, p) => s + p.valor, 0) || 0;
    const totalReceeitasVencidas = parcelasResult.data?.filter(p => p.status === 'vencido').reduce((s, p) => s + p.valor, 0) || 0;

    const receitasAvulsas = lancamentosResult.data?.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0) || 0;
    const despesas = lancamentosResult.data?.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0) || 0;
    const despesasPendentes = lancamentosResult.data?.filter(l => l.tipo === 'despesa' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0) || 0;

    const totalEntradas = totalReceitas + receitasAvulsas;
    const saldoAtual = totalEntradas - despesas;

    res.json({
      total_entradas: totalEntradas,
      total_saidas: despesas,
      saldo: saldoAtual,
      receitas_locacao: totalReceitas,
      receitas_avulsas: receitasAvulsas,
      receitas_pendentes: totalReceitasPendentes,
      receitas_vencidas: totalReceeitasVencidas,
      despesas_pagas: despesas,
      despesas_pendentes: despesasPendentes,
      parcelas: parcelasResult.data || [],
      lancamentos: lancamentosResult.data || [],
    });
  } catch {
    res.status(500).json({ error: 'Erro ao calcular fluxo de caixa' });
  }
});

// POST /api/lancamentos
router.post('/', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = lancamentoSchema.parse(req.body);

    if (body.categoria_id === '') body.categoria_id = null;
    if (body.cliente_id === '') body.cliente_id = null;
    if (body.fornecedor_id === '') body.fornecedor_id = null;
    if (body.maquina_id === '') body.maquina_id = null;
    if (body.contrato_id === '') body.contrato_id = null;

    const { numero_parcelas, ...lancamentoData } = body;

    const records = [];
    let currentVencimento = body.data_vencimento ? new Date(body.data_vencimento) : new Date(body.data_competencia);

    for (let i = 1; i <= numero_parcelas; i++) {
      let desc = body.descricao;
      if (numero_parcelas > 1) desc = `${body.descricao} (${i}/${numero_parcelas})`;

      const isoDate = currentVencimento.toISOString().split('T')[0];

      records.push({
        ...lancamentoData,
        descricao: desc,
        empresa_id,
        data_competencia: isoDate,
        data_vencimento: isoDate,
      });

      // Incrementa 1 mês para a próxima parcela
      currentVencimento.setMonth(currentVencimento.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from('lancamentos')
      .insert(records)
      .select('*, categorias(nome)');

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar lançamento' });
  }
});

// PUT /api/lancamentos/:id
router.put('/:id', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = lancamentoSchema.partial().parse(req.body);

    if (body.categoria_id === '') body.categoria_id = null;
    if (body.cliente_id === '') body.cliente_id = null;
    if (body.fornecedor_id === '') body.fornecedor_id = null;
    if (body.maquina_id === '') body.maquina_id = null;
    if (body.contrato_id === '') body.contrato_id = null;

    delete (body as any).numero_parcelas;

    const { data, error } = await supabase
      .from('lancamentos')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar lançamento' });
  }
});

// DELETE /api/lancamentos/:id
router.delete('/:id', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    await supabase.from('lancamentos').update({ status: 'cancelado' }).eq('id', id).eq('empresa_id', empresa_id);
    res.json({ message: 'Lançamento cancelado' });
  } catch {
    res.status(500).json({ error: 'Erro ao cancelar lançamento' });
  }
});

export default router;
