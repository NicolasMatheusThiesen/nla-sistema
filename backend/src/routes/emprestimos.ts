import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

const emprestimoSchema = z.object({
  descricao: z.string().min(1),
  tipo: z.enum(['emprestimo_tomado', 'emprestimo_concedido', 'financiamento']),
  instituicao_financeira: z.string().nullish().or(z.literal('')),
  fornecedor_id: z.string().uuid().nullish().or(z.literal('')),
  cliente_id: z.string().uuid().nullish().or(z.literal('')),
  conta_bancaria_id: z.string().uuid().nullish().or(z.literal('')),
  valor_total: z.coerce.number().positive(),
  taxa_juros: z.coerce.number().min(0).default(0),
  tipo_juros: z.enum(['simples', 'composto', 'fixo', 'sem_juros']).default('sem_juros'),
  numero_parcelas: z.coerce.number().int().min(1).default(1),
  valor_parcela: z.coerce.number().positive().nullish(),
  data_contratacao: z.string(),
  data_primeiro_vencimento: z.string(),
  observacoes: z.string().nullish().or(z.literal('')),
});

const pagarParcelaSchema = z.object({
  valor_pago: z.coerce.number().positive().max(999999999.99).optional(),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  forma_pagamento: z.string().max(80).optional(),
  conta_bancaria_id: z.string().uuid().optional(),
  observacoes: z.string().max(2000).optional(),
});

// GET /api/emprestimos
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { tipo, status } = req.query;

    let query = supabase
      .from('emprestimos')
      .select(`
        *,
        fornecedores(id, razao_social),
        clientes(id, razao_social),
        contas_bancarias(id, nome, banco),
        emprestimo_parcelas(id, numero_parcela, data_vencimento, valor_parcela, valor_pago, status, data_pagamento)
      `)
      .eq('empresa_id', empresa_id)
      .order('data_contratacao', { ascending: false });

    if (tipo) query = query.eq('tipo', tipo as string);
    if (status) query = query.eq('status', status as string);

    const { data, error } = await query;
    if (error) throw error;

    // Enriquece cada empréstimo com resumo de parcelas
    const enriched = (data || []).map((emp: any) => {
      const parcelas = emp.emprestimo_parcelas || [];
      const pagas = parcelas.filter((p: any) => p.status === 'pago');
      const totalPago = pagas.reduce((acc: number, p: any) => acc + (Number(p.valor_pago) || Number(p.valor_parcela) || 0), 0);
      const totalPendente = parcelas
        .filter((p: any) => p.status === 'pendente' || p.status === 'vencido')
        .reduce((acc: number, p: any) => acc + (Number(p.valor_parcela) || 0), 0);

      return {
        ...emp,
        resumo: {
          total_parcelas: parcelas.length,
          parcelas_pagas: pagas.length,
          total_pago: Number(totalPago.toFixed(2)),
          total_pendente: Number(totalPendente.toFixed(2)),
          percentual_pago: parcelas.length > 0 ? Math.round((pagas.length / parcelas.length) * 100) : 0,
        }
      };
    });

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar empréstimos e financiamentos' });
  }
});

// GET /api/emprestimos/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('emprestimos')
      .select(`
        *,
        fornecedores(id, razao_social),
        clientes(id, razao_social),
        contas_bancarias(id, nome, banco),
        emprestimo_parcelas(*)
      `)
      .eq('id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Empréstimo não encontrado' });

    // Ordenar parcelas numericamente
    if (data.emprestimo_parcelas) {
      data.emprestimo_parcelas.sort((a: any, b: any) => a.numero_parcela - b.numero_parcela);
    }

    res.json(data);
  } catch {
    res.status(500).json({ error: 'Erro ao obter dados do empréstimo' });
  }
});

// POST /api/emprestimos
router.post('/', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const body = emprestimoSchema.parse(req.body);

    if (body.fornecedor_id === '') body.fornecedor_id = null;
    if (body.cliente_id === '') body.cliente_id = null;
    if (body.conta_bancaria_id === '') body.conta_bancaria_id = null;
    if (body.instituicao_financeira === '') body.instituicao_financeira = null;

    const [fornecedorCheck, clienteCheck, contaCheck] = await Promise.all([
      body.fornecedor_id
        ? supabase.from('fornecedores').select('id').eq('id', body.fornecedor_id).eq('empresa_id', empresa_id).maybeSingle()
        : Promise.resolve({ data: true, error: null }),
      body.cliente_id
        ? supabase.from('clientes').select('id').eq('id', body.cliente_id).eq('empresa_id', empresa_id).maybeSingle()
        : Promise.resolve({ data: true, error: null }),
      body.conta_bancaria_id
        ? supabase.from('contas_bancarias').select('id').eq('id', body.conta_bancaria_id).eq('empresa_id', empresa_id).maybeSingle()
        : Promise.resolve({ data: true, error: null }),
    ]);
    if (fornecedorCheck.error || !fornecedorCheck.data || clienteCheck.error || !clienteCheck.data || contaCheck.error || !contaCheck.data) {
      return res.status(400).json({ error: 'Fornecedor, cliente ou conta bancária não pertence a esta empresa' });
    }

    const numParcelas = body.numero_parcelas;
    let valorParcelaCalculado = body.valor_parcela;
    let valorTotalParcelado: number;

    if (valorParcelaCalculado && valorParcelaCalculado > 0) {
      valorTotalParcelado = Number((valorParcelaCalculado * numParcelas).toFixed(2));
    } else if (body.taxa_juros > 0 && body.tipo_juros === 'simples') {
      const montante = body.valor_total * (1 + (body.taxa_juros / 100) * numParcelas);
      valorTotalParcelado = Number(montante.toFixed(2));
      valorParcelaCalculado = Number((valorTotalParcelado / numParcelas).toFixed(2));
    } else if (body.taxa_juros > 0 && body.tipo_juros === 'composto') {
      const i = body.taxa_juros / 100;
      const fator = (Math.pow(1 + i, numParcelas) * i) / (Math.pow(1 + i, numParcelas) - 1);
      valorParcelaCalculado = Number((body.valor_total * fator).toFixed(2));
      valorTotalParcelado = Number((valorParcelaCalculado * numParcelas).toFixed(2));
    } else {
      valorTotalParcelado = Number(body.valor_total.toFixed(2));
      valorParcelaCalculado = Number((valorTotalParcelado / numParcelas).toFixed(2));
    }

    if (!valorParcelaCalculado || valorParcelaCalculado <= 0 || !Number.isFinite(valorTotalParcelado)) {
      return res.status(400).json({ error: 'Não foi possível calcular o valor das parcelas' });
    }

    const valorUltimaParcela = Number((valorTotalParcelado - valorParcelaCalculado * (numParcelas - 1)).toFixed(2));
    if (valorUltimaParcela <= 0) {
      return res.status(400).json({ error: 'O valor informado não cobre o total das parcelas' });
    }

    // Criar o registro de empréstimo
    const { data: emprestimo, error: empError } = await supabase
      .from('emprestimos')
      .insert({
        empresa_id,
        descricao: body.descricao,
        tipo: body.tipo,
        instituicao_financeira: body.instituicao_financeira || null,
        fornecedor_id: body.fornecedor_id || null,
        cliente_id: body.cliente_id || null,
        conta_bancaria_id: body.conta_bancaria_id || null,
        valor_total: body.valor_total,
        taxa_juros: body.taxa_juros,
        tipo_juros: body.tipo_juros,
        numero_parcelas: numParcelas,
        valor_parcela: valorParcelaCalculado,
        data_contratacao: body.data_contratacao,
        data_primeiro_vencimento: body.data_primeiro_vencimento,
        status: 'ativo',
        observacoes: body.observacoes || null,
      })
      .select()
      .single();

    if (empError || !emprestimo) throw empError;

    // Gerar parcelas e lançamentos
    const baseVencimento = new Date(body.data_primeiro_vencimento + 'T12:00:00');
    const tipoLancamento = body.tipo === 'emprestimo_concedido' ? 'receita' : 'despesa';
    const tipoDescricao = body.tipo === 'financiamento' ? 'Financiamento' : (body.tipo === 'emprestimo_concedido' ? 'Empréstimo Concedido' : 'Empréstimo Tomado');

    const parcelasToInsert = [];
    const lancamentosToInsert = [];

    for (let i = 1; i <= numParcelas; i++) {
      const dataVenc = new Date(baseVencimento);
      if (i > 1) {
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
      }
      const dataVencStr = dataVenc.toISOString().split('T')[0];

      lancamentosToInsert.push({
        empresa_id,
        tipo: tipoLancamento,
        descricao: `${tipoDescricao}: ${body.descricao} (${i}/${numParcelas})`,
        fornecedor_id: body.fornecedor_id || null,
        cliente_id: body.cliente_id || null,
        conta_bancaria_id: body.conta_bancaria_id || null,
        valor: i === numParcelas ? valorUltimaParcela : valorParcelaCalculado,
        data_competencia: body.data_contratacao,
        data_vencimento: dataVencStr,
        status: 'pendente',
        emprestimo_id: emprestimo.id,
        numero_parcela: i,
        total_parcelas: numParcelas,
        observacoes: body.observacoes || null,
      });
    }

    // Insere os lançamentos no financeiro
    const { data: lancamentosCriados, error: lancError } = await supabase
      .from('lancamentos')
      .insert(lancamentosToInsert)
      .select('id');

    if (lancError) throw lancError;

    // Insere as parcelas com o vínculo do lancamento_id correspondente
    for (let i = 1; i <= numParcelas; i++) {
      const dataVenc = new Date(baseVencimento);
      if (i > 1) {
        dataVenc.setMonth(dataVenc.getMonth() + (i - 1));
      }
      const dataVencStr = dataVenc.toISOString().split('T')[0];
      const lancId = lancamentosCriados?.[i - 1]?.id || null;

      parcelasToInsert.push({
        empresa_id,
        emprestimo_id: emprestimo.id,
        numero_parcela: i,
        data_vencimento: dataVencStr,
        valor_parcela: i === numParcelas ? valorUltimaParcela : valorParcelaCalculado,
        status: 'pendente',
        conta_bancaria_id: body.conta_bancaria_id || null,
        lancamento_id: lancId,
      });
    }

    const { error: parcelasError } = await supabase
      .from('emprestimo_parcelas')
      .insert(parcelasToInsert);

    if (parcelasError) throw parcelasError;

    res.status(201).json({ ...emprestimo, parcelas_geradas: numParcelas });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    }
    res.status(500).json({ error: 'Erro ao cadastrar empréstimo/financiamento' });
  }
});

// PATCH /api/emprestimos/:id/parcelas/:parcelaId/pagar
router.patch('/:id/parcelas/:parcelaId/pagar', authenticate, requireRole('admin', 'financeiro'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id, parcelaId } = req.params;
    const body = pagarParcelaSchema.parse(req.body);
    const { valor_pago, data_pagamento, forma_pagamento, conta_bancaria_id, observacoes } = body;

    if (conta_bancaria_id) {
      const { data: conta } = await supabase
        .from('contas_bancarias')
        .select('id')
        .eq('id', conta_bancaria_id)
        .eq('empresa_id', empresa_id)
        .maybeSingle();
      if (!conta) return res.status(400).json({ error: 'Conta bancária não pertence a esta empresa' });
    }

    const dataPagamentoFinal = data_pagamento || new Date().toISOString().split('T')[0];

    // Buscar a parcela
    const { data: parcela, error: pError } = await supabase
      .from('emprestimo_parcelas')
      .select('*')
      .eq('id', parcelaId)
      .eq('emprestimo_id', id)
      .eq('empresa_id', empresa_id)
      .single();

    if (pError || !parcela) return res.status(404).json({ error: 'Parcela não encontrada' });
    if (parcela.status !== 'pendente' && parcela.status !== 'vencido') {
      return res.status(409).json({ error: 'Esta parcela já foi liquidada ou cancelada' });
    }

    const valorPagoFinal = valor_pago ?? parcela.valor_parcela;

    // Atualizar parcela
    const { data: updatedParcela, error: updateError } = await supabase
      .from('emprestimo_parcelas')
      .update({
        status: 'pago',
        valor_pago: valorPagoFinal,
        data_pagamento: dataPagamentoFinal,
        forma_pagamento: forma_pagamento || 'transferencia',
        conta_bancaria_id: conta_bancaria_id || parcela.conta_bancaria_id,
        observacoes: observacoes || parcela.observacoes,
      })
      .eq('id', parcelaId)
      .eq('empresa_id', empresa_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Se possui lançamento financeiro associado, atualizar lançamento para pago (o trigger cuidará do saldo bancário)
    if (parcela.lancamento_id) {
      const { error: lancamentoError } = await supabase
        .from('lancamentos')
        .update({
          status: 'pago',
          data_pagamento: dataPagamentoFinal,
          valor: valorPagoFinal,
          conta_bancaria_id: conta_bancaria_id || parcela.conta_bancaria_id,
          forma_pagamento: forma_pagamento || 'transferencia',
        })
        .eq('id', parcela.lancamento_id)
        .eq('empresa_id', empresa_id);
      if (lancamentoError) throw lancamentoError;
    }

    // Verificar se todas as parcelas do empréstimo foram pagas
    const { data: todasParcelas } = await supabase
      .from('emprestimo_parcelas')
      .select('status')
      .eq('emprestimo_id', id)
      .eq('empresa_id', empresa_id);

    const todasPagas = todasParcelas?.every(p => p.status === 'pago');
    if (todasPagas) {
      await supabase.from('emprestimos').update({ status: 'quitado' }).eq('id', id).eq('empresa_id', empresa_id);
    }

    res.json({ message: 'Parcela liquidada com sucesso', parcela: updatedParcela, quitado: !!todasPagas });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ') });
    }
    res.status(500).json({ error: 'Erro ao registrar pagamento da parcela' });
  }
});

// DELETE /api/emprestimos/:id
router.delete('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { id } = req.params;

    // Exclui lançamentos vinculados no financeiro
    await supabase.from('lancamentos').delete().eq('emprestimo_id', id).eq('empresa_id', empresa_id);

    // Exclui empréstimo (cascade remove emprestimo_parcelas)
    const { error } = await supabase.from('emprestimos').delete().eq('id', id).eq('empresa_id', empresa_id);
    if (error) throw error;

    res.json({ message: 'Empréstimo e lançamentos removidos com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir empréstimo' });
  }
});

export default router;
