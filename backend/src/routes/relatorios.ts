import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { reportRateLimit } from '../middleware/rateLimit';
import { generateFluxoCaixaPDF, generateRentabilidadePDF, generateInadimplenciaPDF } from '../services/pdf.service';
import { generateFluxoCaixaExcel, generateRentabilidadeExcel } from '../services/excel.service';

const router = Router();

// GET /api/relatorios/fluxo-caixa?mes_inicio=2024-01&mes_fim=2024-12&formato=pdf
router.get('/fluxo-caixa', authenticate, reportRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { mes_inicio, mes_fim, formato = 'json' } = req.query;

    if (!mes_inicio || !mes_fim) {
      return res.status(400).json({ error: 'mes_inicio e mes_fim são obrigatórios' });
    }

    const [parcelasResult, lancamentosResult, empresaResult] = await Promise.all([
      supabase.from('parcelas').select('*, clientes(razao_social), contratos(numero)').eq('empresa_id', empresa_id).gte('data_vencimento', `${mes_inicio}-01`).lte('data_vencimento', `${mes_fim}-31`).order('data_vencimento'),
      supabase.from('lancamentos').select('*, categorias(nome, cor)').eq('empresa_id', empresa_id).gte('data_competencia', `${mes_inicio}-01`).lte('data_competencia', `${mes_fim}-31`).order('data_competencia'),
      supabase.from('empresa').select('*').eq('id', empresa_id).single(),
    ]);

    const dados = {
      empresa: empresaResult.data,
      periodo: { inicio: mes_inicio as string, fim: mes_fim as string },
      parcelas: parcelasResult.data || [],
      lancamentos: lancamentosResult.data || [],
      totais: {
        receitas: (parcelasResult.data?.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor_pago || p.valor), 0) || 0) + (lancamentosResult.data?.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0) || 0),
        despesas: lancamentosResult.data?.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0) || 0,
        inadimplencia: parcelasResult.data?.filter(p => p.status === 'vencido').reduce((s, p) => s + p.valor, 0) || 0,
      },
    };

    if (formato === 'pdf') {
      const pdf = await generateFluxoCaixaPDF(dados);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=fluxo-caixa-${mes_inicio}-${mes_fim}.pdf`);
      return res.send(pdf);
    }

    if (formato === 'excel') {
      const excel = await generateFluxoCaixaExcel(dados);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=fluxo-caixa-${mes_inicio}-${mes_fim}.xlsx`);
      return res.send(excel);
    }

    res.json(dados);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório de fluxo de caixa' });
  }
});

// GET /api/relatorios/rentabilidade?formato=pdf
router.get('/rentabilidade', authenticate, reportRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { formato = 'json', periodo_meses = '12' } = req.query;

    const meses = parseInt(periodo_meses as string);
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - meses);

    const [maquinasResult, empresaResult] = await Promise.all([
      supabase.from('maquinas').select('*, manutencoes(custo, data_inicio), contrato_itens(valor_unitario)').eq('empresa_id', empresa_id).eq('ativo', true),
      supabase.from('empresa').select('*').eq('id', empresa_id).single(),
    ]);

    const maquinasComRentabilidade = (maquinasResult.data || []).map(m => {
      const receitaEstimada = (m.contrato_itens || []).reduce((s: number, ci: { valor_unitario: number }) => s + (ci.valor_unitario * meses), 0);
      const custoManut = (m.manutencoes || []).filter((mn: { data_inicio: string }) => mn.data_inicio >= dataInicio.toISOString().split('T')[0]).reduce((s: number, mn: { custo: number }) => s + (mn.custo || 0), 0);
      const depreciacao = (m.valor_aquisicao || 0) * 0.20 / 12 * meses;
      const custoTotal = custoManut + depreciacao;
      const lucro = receitaEstimada - custoTotal;
      const roi = m.valor_aquisicao > 0 ? (lucro / m.valor_aquisicao) * 100 : 0;
      return { ...m, receita_estimada: receitaEstimada, custo_manutencao: custoManut, custo_depreciacao: depreciacao, custo_total: custoTotal, lucro_liquido: lucro, roi_percentual: roi };
    }).sort((a, b) => b.roi_percentual - a.roi_percentual);

    const dados = { empresa: empresaResult.data, periodo_meses: meses, maquinas: maquinasComRentabilidade };

    if (formato === 'pdf') {
      const pdf = await generateRentabilidadePDF(dados);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=rentabilidade.pdf');
      return res.send(pdf);
    }
    if (formato === 'excel') {
      const excel = await generateRentabilidadeExcel(dados);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=rentabilidade.xlsx');
      return res.send(excel);
    }

    res.json(dados);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório de rentabilidade' });
  }
});

// GET /api/relatorios/inadimplencia
router.get('/inadimplencia', authenticate, reportRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { formato = 'json' } = req.query;

    const [parcelasResult, empresaResult] = await Promise.all([
      supabase.from('parcelas').select('*, clientes(razao_social, telefone, email), contratos(numero)').eq('empresa_id', empresa_id).eq('status', 'vencido').order('data_vencimento'),
      supabase.from('empresa').select('*').eq('id', empresa_id).single(),
    ]);

    // Agrupar por cliente
    const porCliente: Record<string, { cliente: unknown; parcelas: unknown[]; total: number }> = {};
    (parcelasResult.data || []).forEach(p => {
      const cid = p.cliente_id;
      if (!porCliente[cid]) porCliente[cid] = { cliente: p.clientes, parcelas: [], total: 0 };
      porCliente[cid].parcelas.push(p);
      porCliente[cid].total += p.valor;
    });

    const dados = {
      empresa: empresaResult.data,
      data_relatorio: new Date().toISOString(),
      total_inadimplencia: parcelasResult.data?.reduce((s, p) => s + p.valor, 0) || 0,
      clientes_inadimplentes: Object.values(porCliente),
    };

    if (formato === 'pdf') {
      const pdf = await generateInadimplenciaPDF(dados);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=inadimplencia.pdf');
      return res.send(pdf);
    }

    res.json(dados);
  } catch {
    res.status(500).json({ error: 'Erro ao gerar relatório de inadimplência' });
  }
});

export default router;
