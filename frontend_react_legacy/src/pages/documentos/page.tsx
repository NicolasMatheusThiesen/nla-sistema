

import { useState } from 'react';
import { useContratos, useVendas, useGerarContratoPDF, useGerarFaturaPDF, useGerarVendaPDF, type Contrato, type Venda } from '@/hooks/useApi';
import { formatMoney, formatDate } from '@/lib/utils';
import { Button, Skeleton, EmptyState, Input } from '@/components/ui';

type Tab = 'contratos' | 'vendas';

function ContratoCard({ contrato }: { contrato: Contrato }) {
  const [competencia, setCompetencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [numFatura, setNumFatura] = useState(() => String(Math.floor(Math.random() * 900 + 100)));
  const gerarContrato = useGerarContratoPDF();
  const gerarFatura = useGerarFaturaPDF();

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-foreground text-base">{contrato.clientes?.razao_social || '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Contrato nº {contrato.numero}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          contrato.status === 'ativo' ? 'bg-green-100 text-green-700' :
          contrato.status === 'suspenso' ? 'bg-yellow-100 text-yellow-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {contrato.status}
        </span>
      </div>

      {/* Info */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Valor Mensal</p>
          <p className="font-semibold text-green-600">{formatMoney(contrato.valor_mensal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Início</p>
          <p className="font-medium">{formatDate(contrato.data_inicio)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vencimento</p>
          <p className="font-medium">Dia {contrato.dia_vencimento}</p>
        </div>
      </div>

      {/* Equipamentos */}
      {contrato.contrato_itens && contrato.contrato_itens.length > 0 && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Equipamentos</p>
          {contrato.contrato_itens.map((item: any, i: number) => (
            <p key={i} className="text-sm text-foreground">{item.maquinas?.nome || '—'} — {formatMoney(item.valor_unitario)}</p>
          ))}
        </div>
      )}

      {/* Ações */}
      <div className="border-t border-border/50 pt-4 space-y-3">
        {/* Contrato PDF */}
        <Button
          className="w-full"
          variant="outline"
          loading={gerarContrato.isPending}
          onClick={() => gerarContrato.mutate(contrato.id)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          📄 Gerar Contrato PDF
        </Button>

        {/* Fatura PDF */}
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2">
          <p className="text-xs font-semibold text-blue-800">🧾 Emitir Fatura de Locação</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Competência</label>
              <input
                type="month"
                value={competencia}
                onChange={e => setCompetencia(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nº Fatura</label>
              <input
                type="text"
                value={numFatura}
                onChange={e => setNumFatura(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            loading={gerarFatura.isPending}
            onClick={() => gerarFatura.mutate({ contratoId: contrato.id, competencia, num: numFatura })}
          >
            Baixar Fatura PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function VendaCard({ venda }: { venda: Venda }) {
  const gerarVenda = useGerarVendaPDF();

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-bold text-foreground">{venda.clientes?.razao_social || '—'}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{venda.maquinas?.nome} {venda.maquinas?.modelo ? `— ${venda.maquinas.modelo}` : ''}</p>
        </div>
        <p className="text-lg font-bold text-green-600">{formatMoney(venda.valor_venda)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Data</p>
          <p className="font-medium">{formatDate(venda.data_venda)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pagamento</p>
          <p className="font-medium capitalize">{venda.forma_pagamento === 'avista' ? 'À Vista' : venda.forma_pagamento}</p>
        </div>
      </div>

      <Button
        className="w-full"
        variant="outline"
        loading={gerarVenda.isPending}
        onClick={() => gerarVenda.mutate(venda.id)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        📄 Gerar Recibo de Venda PDF
      </Button>
    </div>
  );
}

export default function DocumentosPage() {
  const [tab, setTab] = useState<Tab>('contratos');
  const [search, setSearch] = useState('');
  const { data: contratos, isLoading: loadingContratos } = useContratos();
  const { data: vendas, isLoading: loadingVendas } = useVendas();

  const contratosFiltrados = (contratos || []).filter(c =>
    !search || c.clientes?.razao_social?.toLowerCase().includes(search.toLowerCase()) || c.numero?.toLowerCase().includes(search.toLowerCase())
  );

  const vendasFiltradas = (vendas || []).filter(v =>
    !search || v.clientes?.razao_social?.toLowerCase().includes(search.toLowerCase()) || v.maquinas?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Documentos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gere contratos, faturas e recibos em PDF</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <div className="text-sm text-blue-800">
          <p className="font-semibold">Geração de PDF</p>
          <p>Os documentos são gerados automaticamente com os dados cadastrados. <strong>Contrato de Locação</strong> inclui todas as cláusulas padrão NLA. <strong>Fatura</strong> segue o modelo oficial com cabeçalho, período e total.</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('contratos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'contratos' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            📋 Contratos ({contratos?.length || 0})
          </button>
          <button
            onClick={() => setTab('vendas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'vendas' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            🛒 Vendas ({vendas?.length || 0})
          </button>
        </div>
        <div className="relative w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="flex h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Cards */}
      {tab === 'contratos' && (
        loadingContratos ? (
          <div className="grid grid-cols-2 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>
        ) : contratosFiltrados.length === 0 ? (
          <EmptyState title="Nenhum contrato encontrado" description="Crie contratos de locação para gerar documentos." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contratosFiltrados.map(c => <ContratoCard key={c.id} contrato={c} />)}
          </div>
        )
      )}

      {tab === 'vendas' && (
        loadingVendas ? (
          <div className="grid grid-cols-2 gap-4">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : vendasFiltradas.length === 0 ? (
          <EmptyState title="Nenhuma venda encontrada" description="Registre vendas para gerar recibos." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {vendasFiltradas.map(v => <VendaCard key={v.id} venda={v} />)}
          </div>
        )
      )}
    </div>
  );
}
