import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const maquinaSchema = z.object({
  nome: z.string().min(1),
  modelo: z.string().nullish().or(z.literal('')),
  marca: z.string().nullish().or(z.literal('')),
  numero_serie: z.string().nullish().or(z.literal('')),
  ano_fabricacao: z.coerce.number().int().min(1900).max(new Date().getFullYear()).nullish(),
  tipo: z.string().min(1), // dynamic type from database
  subtipo: z.string().nullish().or(z.literal('')),
  capacidade_kg: z.coerce.number().positive().nullish(),
  altura_max_elevacao: z.coerce.number().positive().nullish(),
  valor_aquisicao: z.coerce.number().min(0).default(0),
  valor_mercado: z.coerce.number().min(0).default(0),
  custo_mensal_estimado: z.coerce.number().min(0).default(0),
  data_aquisicao: z.string().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
});

// GET /api/maquinas
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { status, tipo, search } = req.query;

    let query = supabase
      .from('maquinas')
      .select(`
        *,
        contrato_itens(
          contrato_id,
          contratos(status, cliente_id, clientes(razao_social))
        )
      `)
      .eq('empresa_id', empresa_id)
      .eq('ativo', true)
      .order('nome');

    if (status) query = query.eq('status', status as string);
    if (tipo) query = query.eq('tipo', tipo as string);
    if (search) query = query.ilike('nome', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('GET /api/maquinas:', err);
    res.status(500).json({ error: 'Erro ao listar mÃ¡quinas' });
  }
});

// GET /api/maquinas/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const [maquinaResult, manutencoesResult, parcelasResult] = await Promise.all([
      supabase
        .from('maquinas')
        .select('*, maquina_documentos(*)')
        .eq('id', id)
        .eq('empresa_id', empresa_id)
        .single(),
      supabase
        .from('manutencoes')
        .select('*')
        .eq('maquina_id', id)
        .order('data_inicio', { ascending: false }),
      supabase
        .from('parcelas')
        .select('*, contratos(numero, clientes(razao_social))')
        .eq('empresa_id', empresa_id)
        .order('data_vencimento', { ascending: false })
        .limit(24),
    ]);

    if (maquinaResult.error || !maquinaResult.data) {
      return res.status(404).json({ error: 'MÃ¡quina nÃ£o encontrada' });
    }

    // Calcular rentabilidade
    const totalReceita = parcelasResult.data
      ?.filter(p => p.status === 'pago' && p.contrato?.maquinas_ids?.includes(id))
      .reduce((sum, p) => sum + (p.valor_pago || p.valor), 0) || 0;

    const totalCustos = manutencoesResult.data
      ?.reduce((sum, m) => sum + (m.custo || 0), 0) || 0;

    const valorAquisicao = maquinaResult.data.valor_aquisicao || 0;
    const lucroLiquido = totalReceita - totalCustos;
    const roi = valorAquisicao > 0 ? ((lucroLiquido / valorAquisicao) * 100) : 0;

    res.json({
      ...maquinaResult.data,
      manutencoes: manutencoesResult.data || [],
      rentabilidade: {
        total_receita: totalReceita,
        total_custos: totalCustos,
        lucro_liquido: lucroLiquido,
        roi_percentual: Math.round(roi * 100) / 100,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mÃ¡quina' });
  }
});

// POST /api/maquinas
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = maquinaSchema.parse(req.body);

    if (body.data_aquisicao === '') body.data_aquisicao = null;

    const { data, error } = await supabase
      .from('maquinas')
      .insert({ ...body, empresa_id })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/maquinas:', err);
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar mÃ¡quina' });
  }
});

// PUT /api/maquinas/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = maquinaSchema.partial().parse(req.body);

    if (body.data_aquisicao === '') body.data_aquisicao = null;

    const { data, error } = await supabase
      .from('maquinas')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'MÃ¡quina nÃ£o encontrada' });
    res.json(data);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar mÃ¡quina' });
  }
});

// DELETE /api/maquinas/:id (soft delete)
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { error } = await supabase
      .from('maquinas')
      .update({ ativo: false })
      .eq('id', id)
      .eq('empresa_id', empresa_id);

    if (error) throw error;
    res.json({ message: 'MÃ¡quina removida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover mÃ¡quina' });
  }
});

// GET /api/maquinas/:id/rentabilidade
router.get('/:id/rentabilidade', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { periodo_meses = '12' } = req.query;

    const meses = parseInt(periodo_meses as string);
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - meses);

    const [maquinaResult, manutencoesResult, contratosResult] = await Promise.all([
      supabase.from('maquinas').select('*').eq('id', id).eq('empresa_id', empresa_id).single(),
      supabase.from('manutencoes').select('custo, data_inicio, tipo').eq('maquina_id', id).gte('data_inicio', dataInicio.toISOString().split('T')[0]),
      supabase.from('contrato_itens').select('valor_unitario, contrato_id, contratos(data_inicio, data_fim, status)').eq('maquina_id', id),
    ]);

    if (!maquinaResult.data) return res.status(404).json({ error: 'MÃ¡quina nÃ£o encontrada' });

    const totalCustoManutencao = manutencoesResult.data?.reduce((sum, m) => sum + (m.custo || 0), 0) || 0;
    const valorAquisicao = maquinaResult.data.valor_aquisicao || 0;

    // Estimar receita baseada nos contratos ativos
    const receitaEstimada = contratosResult.data?.reduce((sum, item) => {
      return sum + (item.valor_unitario * meses);
    }, 0) || 0;

    const depreciacao = valorAquisicao * 0.20 / 12 * meses; // 20% ao ano
    const custoTotal = totalCustoManutencao + depreciacao + ((maquinaResult.data.custo_mensal_estimado || 0) * meses);
    const lucroLiquido = receitaEstimada - custoTotal;
    const roi = valorAquisicao > 0 ? (lucroLiquido / valorAquisicao) * 100 : 0;
    const paybackMeses = (lucroLiquido > 0 && receitaEstimada > custoTotal)
      ? Math.ceil(valorAquisicao / ((receitaEstimada - custoTotal) / meses))
      : null;

    res.json({
      maquina: maquinaResult.data,
      periodo_meses: meses,
      receita_estimada: receitaEstimada,
      custo_manutencao: totalCustoManutencao,
      custo_depreciacao: depreciacao,
      custo_outros: (maquinaResult.data.custo_mensal_estimado || 0) * meses,
      custo_total: custoTotal,
      lucro_liquido: lucroLiquido,
      margem_percentual: receitaEstimada > 0 ? (lucroLiquido / receitaEstimada) * 100 : 0,
      roi_percentual: roi,
      payback_meses: paybackMeses,
      manutencoes: manutencoesResult.data || [],
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular rentabilidade' });
  }
});

export default router;
