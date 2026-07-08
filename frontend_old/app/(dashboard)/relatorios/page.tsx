'use client';

import { useState } from 'react';
import { useDownloadRelatorio } from '@/hooks/useApi';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { getCurrentMonth } from '@/lib/utils';

interface ReportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onDownloadPDF?: () => void;
  onDownloadExcel?: () => void;
  children?: React.ReactNode;
}

function ReportCard({ title, description, icon, color, onDownloadPDF, onDownloadExcel, children }: ReportCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className={`h-1.5 ${color}`} />
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-2.5 rounded-xl ${color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
        <div className="flex gap-2 pt-3 border-t border-border/50">
          {onDownloadPDF && (
            <Button variant="outline" size="sm" onClick={onDownloadPDF} className="flex-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar PDF
            </Button>
          )}
          {onDownloadExcel && (
            <Button variant="outline" size="sm" onClick={onDownloadExcel} className="flex-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar Excel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = getCurrentMonth();

  const [fluxoInicio, setFluxoInicio] = useState(`${thisYear}-01`);
  const [fluxoFim, setFluxoFim] = useState(thisMonth);
  const [periodoRent, setPeriodoRent] = useState('12');

  const downloadMut = useDownloadRelatorio();

  const download = (path: string, filename: string) => downloadMut.mutate({ path, filename });

  const iconCash = (
    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const iconMachine = (
    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );

  const iconWarning = (
    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Central de Relatórios</h2>
        <p className="text-sm text-muted-foreground">Exporte relatórios em PDF ou Excel para análise e compartilhamento.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Fluxo de Caixa */}
        <ReportCard
          title="Fluxo de Caixa"
          description="Entradas, saídas, saldo e inadimplência por período."
          icon={iconCash}
          color="bg-blue-500"
          onDownloadPDF={() => download(`/api/relatorios/fluxo-caixa?mes_inicio=${fluxoInicio}&mes_fim=${fluxoFim}&formato=pdf`, `fluxo-caixa-${fluxoInicio}-${fluxoFim}.pdf`)}
          onDownloadExcel={() => download(`/api/relatorios/fluxo-caixa?mes_inicio=${fluxoInicio}&mes_fim=${fluxoFim}&formato=excel`, `fluxo-caixa-${fluxoInicio}-${fluxoFim}.xlsx`)}
        >
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs text-muted-foreground">Início</label>
              <input type="month" value={fluxoInicio} onChange={e => setFluxoInicio(e.target.value)}
                className="mt-1 flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fim</label>
              <input type="month" value={fluxoFim} onChange={e => setFluxoFim(e.target.value)}
                className="mt-1 flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>
        </ReportCard>

        {/* Rentabilidade */}
        <ReportCard
          title="Rentabilidade por Máquina"
          description="ROI, lucro, custos e payback de cada equipamento da frota."
          icon={iconMachine}
          color="bg-purple-500"
          onDownloadPDF={() => download(`/api/relatorios/rentabilidade?periodo_meses=${periodoRent}&formato=pdf`, `rentabilidade-${periodoRent}meses.pdf`)}
          onDownloadExcel={() => download(`/api/relatorios/rentabilidade?periodo_meses=${periodoRent}&formato=excel`, `rentabilidade-${periodoRent}meses.xlsx`)}
        >
          <div className="mb-3">
            <label className="text-xs text-muted-foreground">Período de análise</label>
            <select value={periodoRent} onChange={e => setPeriodoRent(e.target.value)}
              className="mt-1 flex h-8 w-full rounded-md border border-input bg-white px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="3">Últimos 3 meses</option>
              <option value="6">Últimos 6 meses</option>
              <option value="12">Últimos 12 meses</option>
              <option value="24">Últimos 24 meses</option>
            </select>
          </div>
        </ReportCard>

        {/* Inadimplência */}
        <ReportCard
          title="Inadimplência"
          description="Clientes e parcelas vencidas em aberto."
          icon={iconWarning}
          color="bg-red-500"
          onDownloadPDF={() => download('/api/relatorios/inadimplencia?formato=pdf', 'inadimplencia.pdf')}
        />
      </div>

      {/* Info */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Dica:</strong> Os relatórios são gerados com os dados atuais do sistema em tempo real. 
          Para análises de períodos específicos, ajuste os filtros antes de baixar.
        </p>
      </div>
    </div>
  );
}
