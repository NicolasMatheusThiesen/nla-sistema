import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { addMonths, format } from 'date-fns';
import { calculateComissao, buildContratoLancamentos } from '../services/financeiro.service';

const router = Router();

const contratoSchema = z.object({
  cliente_id: z.string().uuid(),
  tipo_locacao: z.enum(['mensal', 'semestral', 'anual']),
  data_inicio: z.string(),
  data_fim: z.string().nullish().or(z.literal('')),
  dia_vencimento: z.coerce.number().int().min(1).max(28).default(10),
  data_primeiro_vencimento: z.string().nullish().or(z.literal('')),
  valor_mensal: z.coerce.number().positive(),
  indice_reajuste: z.enum(['nenhum', 'ipca', 'igpm', 'fixo']).default('nenhum'),
  percentual_reajuste_fixo: z.coerce.number().nullish(),
  manutencao_inclusa: z.boolean().default(false),
  seguro_incluso: z.boolean().default(false),
  multa_rescisao_percentual: z.coerce.number().min(0).max(100).default(10),
  clausulas_adicionais: z.string().nullish().or(z.literal('')),
  observacoes: z.string().nullish().or(z.literal('')),
  maquina_ids: z.array(z.string().uuid()).min(1),
  valores_unitarios: z.array(z.coerce.number().positive()),
  // Campos de comissÃ£o
  vendedor_id: z.string().uuid().nullish().or(z.literal('')),
  percentual_comissao: z.coerce.number().min(0).max(100).default(0),
  tipo_comissao: z.enum(['percentual', 'fixo']).default('percentual'),
  valor_comissao: z.coerce.number().min(0).default(0),
  numero: z.string().nullish().or(z.literal('')),
});

function generateNumeroContrato(): string {
  const now = new Date();
  return `LOC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function generateParcelas(contratoId: string, empresaId: string, clienteId: string, params: {
  dataInicio: Date;
  dataFim: Date | null;
  valorMensal: number;
  diaVencimento: number;
  dataPrimeiroVencimento?: string | null;
  tipoLocacao: string;
}) {
  const parcelas = [];
  const { dataInicio, dataFim, valorMensal, diaVencimento, dataPrimeiroVencimento, tipoLocacao } = params;

  const totalMeses = tipoLocacao === 'mensal' ? 12 : tipoLocacao === 'semestral' ? 6 : 12;
  const fim = dataFim ? new Date(dataFim) : addMonths(dataInicio, totalMeses);

  let currentCompetencia = new Date(dataInicio);
  
  // Define o vencimento base (se tiver data_primeiro_vencimento, usa ela, senÃ£o pega mÃªs seguinte + dia_vencimento)
  let baseVencimento: Date;
  if (dataPrimeiroVencimento) {
    baseVencimento = new Date(dataPrimeiroVencimento);
  } else {
    baseVencimento = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, diaVencimento);
  }

  let numeroParcela = 1;

  while (currentCompetencia <= fim) {
    const competencia = format(currentCompetencia, 'yyyy-MM');
    const dataVencimento = new Date(baseVencimento.getFullYear(), baseVencimento.getMonth() + (numeroParcela - 1), baseVencimento.getDate());

    parcelas.push({
      empresa_id: empresaId,
      contrato_id: contratoId,
      cliente_id: clienteId,
      competencia,
      numero_parcela: numeroParcela,
      data_vencimento: format(dataVencimento, 'yyyy-MM-dd'),
      valor: valorMensal,
      status: 'pendente',
    });

    currentCompetencia = addMonths(currentCompetencia, 1);
    numeroParcela++;
    if (numeroParcela > 60) break; // Limite de 5 anos
  }

  return parcelas;
}

// GET /api/contratos
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { status, cliente_id } = req.query;

    let query = supabase
      .from('contratos')
      .select(`
        *,
        clientes(id, razao_social, nome_fantasia, cpf_cnpj),
        vendedores(id, nome),
        contrato_itens(id, valor_unitario, maquinas(id, nome, modelo, tipo, status))
      `)
      .eq('empresa_id', empresa_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status as string);
    if (cliente_id) query = query.eq('cliente_id', cliente_id as string);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// GET /api/contratos/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const [contratoResult, parcelasResult] = await Promise.all([
      supabase
        .from('contratos')
        .select(`
          *,
          clientes(*),
          contrato_itens(*, maquinas(*))
        `)
        .eq('id', id)
        .eq('empresa_id', empresa_id)
        .single(),
      supabase
        .from('parcelas')
        .select('*')
        .eq('contrato_id', id)
        .order('numero_parcela'),
    ]);

    if (!contratoResult.data) return res.status(404).json({ error: 'Contrato nÃ£o encontrado' });

    res.json({
      ...contratoResult.data,
      parcelas: parcelasResult.data || [],
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar contrato' });
  }
});

// POST /api/contratos
router.post('/', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = contratoSchema.parse(req.body);
    // Tratar vÃ¡zios como null
    if (body.vendedor_id === '') body.vendedor_id = null;
    if (body.data_fim === '') body.data_fim = null;
    if (body.numero === '') body.numero = undefined;

    // Verificar se mÃ¡quinas estÃ£o disponÃ­veis
    const { data: maquinas } = await supabase
      .from('maquinas')
      .select('id, nome, status')
      .in('id', body.maquina_ids)
      .eq('empresa_id', empresa_id);

    const maquinasIndisponiveis = maquinas?.filter(m => m.status !== 'disponivel') || [];
    if (maquinasIndisponiveis.length > 0) {
      return res.status(400).json({
        error: 'MÃ¡quinas indisponÃ­veis',
        maquinas: maquinasIndisponiveis.map(m => `${m.nome} (${m.status})`),
      });
    }

    // Calcular valor da comissÃ£o
    const valor_comissao = calculateComissao({
      tipoComissao: body.tipo_comissao,
      valorMensal: body.valor_mensal,
      percentualComissao: body.percentual_comissao,
      valorComissao: body.valor_comissao,
    });

    // Criar contrato
    const numero = body.numero || generateNumeroContrato();
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .insert({
        empresa_id,
        numero,
        cliente_id: body.cliente_id,
        tipo_locacao: body.tipo_locacao,
        data_inicio: body.data_inicio,
        data_fim: body.data_fim,
        dia_vencimento: body.dia_vencimento,
        valor_mensal: body.valor_mensal,
        indice_reajuste: body.indice_reajuste,
        percentual_reajuste_fixo: body.percentual_reajuste_fixo,
        manutencao_inclusa: body.manutencao_inclusa,
        seguro_incluso: body.seguro_incluso,
        multa_rescisao_percentual: body.multa_rescisao_percentual,
        clausulas_adicionais: body.clausulas_adicionais,
        observacoes: body.observacoes,
        status: 'ativo',
        vendedor_id: body.vendedor_id || null,
        percentual_comissao: body.percentual_comissao,
        tipo_comissao: body.tipo_comissao,
        valor_comissao,
      })
      .select()
      .single();

    if (contratoError || !contrato) throw contratoError;

    // Criar itens do contrato
    const itens = body.maquina_ids.map((mid, idx) => ({
      contrato_id: contrato.id,
      maquina_id: mid,
      valor_unitario: body.valores_unitarios[idx] || body.valor_mensal / body.maquina_ids.length,
    }));
    await supabase.from('contrato_itens').insert(itens);

    // Atualizar status das mÃ¡quinas para 'locada'
    await supabase.from('maquinas').update({ status: 'locada' }).in('id', body.maquina_ids);

    // Gerar parcelas
    const parcelas = generateParcelas(contrato.id, empresa_id, body.cliente_id, {
      dataInicio: new Date(body.data_inicio + 'T12:00:00'),
      dataFim: body.data_fim ? new Date(body.data_fim + 'T12:00:00') : null,
      valorMensal: body.valor_mensal,
      diaVencimento: body.dia_vencimento,
      dataPrimeiroVencimento: body.data_primeiro_vencimento ? body.data_primeiro_vencimento + 'T12:00:00' : null,
      tipoLocacao: body.tipo_locacao,
    });
    await supabase.from('parcelas').insert(parcelas);

    // Registrar o contrato no financeiro
    const lancamentosFinanceiros = buildContratoLancamentos({
      contratoNumero: contrato.numero,
      empresaId: empresa_id,
      clienteId: body.cliente_id,
      contratoId: contrato.id,
      valorMensal: body.valor_mensal,
      valorComissao: valor_comissao,
      dataInicio: body.data_inicio,
    });

    if (lancamentosFinanceiros.length > 0) {
      await supabase.from('lancamentos').insert(lancamentosFinanceiros);
    }

    res.status(201).json({ ...contrato, parcelas_geradas: parcelas.length });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
});

// PATCH /api/contratos/:id/status
router.patch('/:id/status', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const { status } = req.body;

    if (!['ativo', 'suspenso', 'encerrado'].includes(status)) {
      return res.status(400).json({ error: 'Status invÃ¡lido' });
    }

    const { data: contrato } = await supabase
      .from('contratos')
      .select('*, contrato_itens(maquina_id)')
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (!contrato) return res.status(404).json({ error: 'Contrato nÃ£o encontrado' });

    await supabase.from('contratos').update({ status }).eq('id', id);

    // Se encerrado, liberar as mÃ¡quinas
    if (status === 'encerrado') {
      const maquinaIds = contrato.contrato_itens.map((ci: { maquina_id: string }) => ci.maquina_id);
      await supabase.from('maquinas').update({ status: 'disponivel' }).in('id', maquinaIds);
      // Cancelar parcelas pendentes futuras
      await supabase
        .from('parcelas')
        .update({ status: 'cancelado' })
        .eq('contrato_id', id)
        .eq('status', 'pendente')
        .gte('data_vencimento', new Date().toISOString().split('T')[0]);
    }

    res.json({ message: `Contrato ${status} com sucesso` });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar status do contrato' });
  }
});

// PATCH /api/contratos/:id/parcelas/:parcelaId/pagar
router.patch('/:id/parcelas/:parcelaId/pagar', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { parcelaId } = req.params;
    const { valor_pago, data_pagamento, forma_pagamento, observacoes } = req.body;

    const { data, error } = await supabase
      .from('parcelas')
      .update({
        status: 'pago',
        valor_pago: valor_pago,
        data_pagamento: data_pagamento || new Date().toISOString().split('T')[0],
        forma_pagamento,
        observacoes,
      })
      .eq('id', parcelaId)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao registrar pagamento' });
  }
});

// PUT /api/contratos/:id
router.put('/:id', authenticate, requireRole('admin', 'operacional'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;
    const body = contratoSchema.partial().parse(req.body);

    // Recalcular comissÃ£o se percentual, tipo ou valor mudaram
    if (body.valor_mensal !== undefined || body.percentual_comissao !== undefined || body.tipo_comissao !== undefined || body.valor_comissao !== undefined) {
       const { data: current } = await supabase.from('contratos').select('*').eq('id', id).single();
       if (current) {
         const novoValor = body.valor_mensal ?? current.valor_mensal;
         const novoPercentual = body.percentual_comissao ?? current.percentual_comissao;
         const novoTipo = body.tipo_comissao ?? current.tipo_comissao ?? 'percentual';
         const novoValorComissao = body.valor_comissao ?? current.valor_comissao ?? 0;
         (body as any).valor_comissao = calculateComissao({
           tipoComissao: novoTipo,
           valorMensal: novoValor,
           percentualComissao: novoPercentual,
           valorComissao: novoValorComissao,
         });
         (body as any).tipo_comissao = novoTipo;
       }
    }

    const maquina_ids = body.maquina_ids;
    const valores_unitarios = body.valores_unitarios;
    delete (body as any).maquina_ids;
    delete (body as any).valores_unitarios;

    const { data: contrato, error } = await supabase
      .from('contratos')
      .update(body)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (error) throw error;
    if (!contrato) return res.status(404).json({ error: 'Contrato nÃ£o encontrado' });

    // Atualizar itens se fornecidos (simplificado)
    if (maquina_ids && valores_unitarios && maquina_ids.length === valores_unitarios.length) {
      await supabase.from('contrato_itens').delete().eq('contrato_id', id);
      const itens = maquina_ids.map((mid, idx) => ({
        contrato_id: id,
        maquina_id: mid,
        valor_unitario: valores_unitarios[idx],
      }));
      await supabase.from('contrato_itens').insert(itens);
    }

    res.json(contrato);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
    res.status(500).json({ error: 'Erro ao atualizar contrato' });
  }
});

// DELETE /api/contratos/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Liberar as mÃ¡quinas
    const { data: itens } = await supabase.from('contrato_itens').select('maquina_id').eq('contrato_id', id);
    if (itens && itens.length > 0) {
      const maquinaIds = itens.map((ci: any) => ci.maquina_id);
      await supabase.from('maquinas').update({ status: 'disponivel' }).in('id', maquinaIds);
    }

    const { data: lancamentosContrato } = await supabase
      .from('lancamentos')
      .select('id')
      .eq('contrato_id', id)
      .eq('empresa_id', empresa_id);

    if (lancamentosContrato && lancamentosContrato.length > 0) {
      await supabase.from('lancamentos').delete().eq('contrato_id', id);
    }

    // Excluir contrato (parcelas e itens devem apagar por cascade no DB)
    const { error } = await supabase.from('contratos').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;
    
    res.json({ message: 'Contrato removido' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover contrato' });
  }
});

export default router;
