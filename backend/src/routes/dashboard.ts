import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/dashboard — KPIs e dados do dashboard
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { empresa_id } = req.user!;
    const { mes } = req.query;
    
    let now = new Date();
    if (mes && typeof mes === 'string') {
      const parts = mes.split('-');
      now = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 15);
    }
    
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const firstDayOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Efetuar todas as queries em paralelo
    const [
      maquinasResult,
      parcelasReceberResult,
      lancamentosResult,
      parcelasVencidasResult,
      contratosVencendoResult,
      manutencoesConsolidadoResult,
      fluxoMensalResult,
      fluxoLancamentosResult,
      rentabilidadeResult,
    ] = await Promise.all([
      // Status das máquinas
      supabase
        .from('maquinas')
        .select('status')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true),

      // Parcelas a receber no mês atual (pagas e pendentes)
      supabase
        .from('parcelas')
        .select('valor, valor_pago, status')
        .eq('empresa_id', empresa_id)
        .eq('competencia', currentMonth),

      // Lançamentos avulsos do mês atual
      supabase
        .from('lancamentos')
        .select('valor, tipo, status')
        .eq('empresa_id', empresa_id)
        .gte('data_competencia', firstDayOfMonth)
        .lte('data_competencia', lastDayOfMonth),

      // Parcelas vencidas
      supabase
        .from('parcelas')
        .select('valor, cliente_id')
        .eq('empresa_id', empresa_id)
        .eq('status', 'vencido'),

      // Contratos vencendo em 7 dias
      supabase
        .from('contratos')
        .select('id, numero, data_fim, clientes(razao_social)')
        .eq('empresa_id', empresa_id)
        .eq('status', 'ativo')
        .not('data_fim', 'is', null)
        .lte('data_fim', sevenDaysLater)
        .gte('data_fim', now.toISOString().split('T')[0]),

      // Custos de manutenção do mês
      supabase
        .from('manutencoes')
        .select('custo')
        .eq('empresa_id', empresa_id)
        .gte('data_inicio', firstDayOfMonth)
        .lte('data_inicio', lastDayOfMonth),

      // Fluxo dos últimos 12 meses (parcelas pagas)
      supabase
        .from('parcelas')
        .select('competencia, valor_pago, status')
        .eq('empresa_id', empresa_id)
        .eq('status', 'pago')
        .gte('data_pagamento', new Date(now.getFullYear() - 1, now.getMonth() + 1, 1).toISOString().split('T')[0]),
        
      // Fluxo dos últimos 12 meses (lançamentos)
      supabase
        .from('lancamentos')
        .select('data_competencia, valor, tipo, status')
        .eq('empresa_id', empresa_id)
        .in('status', ['pago', 'recebido'])
        .gte('data_competencia', new Date(now.getFullYear() - 1, now.getMonth() + 1, 1).toISOString().split('T')[0]),

      // Rentabilidade top máquinas
      supabase
        .from('maquinas')
        .select('id, nome, modelo, valor_aquisicao, custo_mensal_estimado')
        .eq('empresa_id', empresa_id)
        .eq('ativo', true)
        .limit(10),
    ]);

    // Calcular KPIs
    const totalMaquinas = maquinasResult.data?.length || 0;
    const maquinasDisp = maquinasResult.data?.filter(m => m.status === 'disponivel').length || 0;
    const maquinasLocadas = maquinasResult.data?.filter(m => m.status === 'locada').length || 0;
    const maquinasManut = maquinasResult.data?.filter(m => m.status === 'manutencao').length || 0;
    const ocupacao = totalMaquinas > 0 ? Math.round((maquinasLocadas / totalMaquinas) * 100) : 0;

    const receitaMesLanc = lancamentosResult.data
      ?.filter(l => l.tipo === 'receita' && l.status === 'pago')
      .reduce((sum, l) => sum + (l.valor || 0), 0) || 0;

    const receitaMes = (parcelasReceberResult.data
      ?.filter(p => p.status === 'pago')
      .reduce((sum, p) => sum + (p.valor_pago || p.valor), 0) || 0) + receitaMesLanc;

    const receitaPendente = parcelasReceberResult.data
      ?.filter(p => p.status === 'pendente')
      .reduce((sum, p) => sum + p.valor, 0) || 0;

    const inadimplencia = parcelasVencidasResult.data
      ?.reduce((sum, p) => sum + p.valor, 0) || 0;

    const custoManutencaoMes = manutencoesConsolidadoResult.data
      ?.reduce((sum, m) => sum + (m.custo || 0), 0) || 0;

    const despesasMes = lancamentosResult.data
      ?.filter(l => l.tipo === 'despesa' && l.status === 'pago')
      .reduce((sum, l) => sum + (l.valor || 0), 0) || 0;

    // Fluxo dos 12 meses
    const meses12: { mes: string; receita: number; despesa: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mesLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const receitaMesItem = fluxoMensalResult.data
        ?.filter(p => p.competencia === mesKey)
        .reduce((sum, p) => sum + (p.valor_pago || 0), 0) || 0;
        
      const receitasLanc = fluxoLancamentosResult.data
        ?.filter(l => l.data_competencia?.startsWith(mesKey) && l.tipo === 'receita')
        .reduce((sum, l) => sum + (l.valor || 0), 0) || 0;

      const despesasLanc = fluxoLancamentosResult.data
        ?.filter(l => l.data_competencia?.startsWith(mesKey) && l.tipo === 'despesa')
        .reduce((sum, l) => sum + (l.valor || 0), 0) || 0;
        
      meses12.push({ mes: mesLabel, receita: receitaMesItem + receitasLanc, despesa: despesasLanc });
    }

    const alertas = [];
    if (contratosVencendoResult.data && contratosVencendoResult.data.length > 0) {
      alertas.push({
        tipo: 'contrato_vencendo',
        mensagem: `${contratosVencendoResult.data.length} contrato(s) vencendo em 7 dias`,
        dados: contratosVencendoResult.data,
      });
    }
    if (parcelasVencidasResult.data && parcelasVencidasResult.data.length > 0) {
      alertas.push({
        tipo: 'inadimplencia',
        mensagem: `${parcelasVencidasResult.data.length} parcelas vencidas`,
        valor: inadimplencia,
      });
    }

    res.json({
      kpis: {
        receita_mes: receitaMes,
        receita_pendente: receitaPendente,
        custo_manutencao_mes: despesasMes, // Reusing this key to mean all despesas
        inadimplencia,
        lucro_liquido: receitaMes - despesasMes,
        total_maquinas: totalMaquinas,
        maquinas_disponiveis: maquinasDisp,
        maquinas_locadas: maquinasLocadas,
        maquinas_manutencao: maquinasManut,
        ocupacao_frota: ocupacao,
      },
      fluxo_mensal: meses12,
      alertas,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

export default router;
