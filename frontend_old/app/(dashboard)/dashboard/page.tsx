'use client';

import { useDashboard } from '@/hooks/useApi';
import { formatMoney } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui';

// ── KPI Card ─────────────────────────────────────────────────────
function KPICard({ title, value, subtitle, colorClass, icon }: {
  title: string; value: string; subtitle?: string; colorClass: string; icon: React.ReactNode;
}) {
  return (
    <div className={`${colorClass} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-white/80">{title}</p>
        <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-white/70 mt-1">{subtitle}</p>}
    </div>
  );
}

// ── Machine Donut ─────────────────────────────────────────────────
const DONUT_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#94a3b8'];

function MachineDonut({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} máquina(s)`, '']} />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ── Cash Flow Chart ───────────────────────────────────────────────
function CashFlowChart({ data }: { data: Array<{ mes: string; receita: number; despesa: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="despesaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
        <Tooltip formatter={(v: number, n: string) => [formatMoney(v), n === 'receita' ? 'Entradas' : 'Saídas']} />
        <Area type="monotone" dataKey="receita" stroke="#3b82f6" strokeWidth={2} fill="url(#receitaGrad)" name="receita" />
        <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} fill="url(#despesaGrad)" name="despesa" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Main Dashboard Page ───────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading } = useDashboard();
  const kpis = data?.kpis;

  const donutData = kpis ? [
    { name: 'Disponíveis', value: kpis.maquinas_disponiveis },
    { name: 'Locadas', value: kpis.maquinas_locadas },
    { name: 'Manutenção', value: kpis.maquinas_manutencao },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-80 col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alertas */}
      {data?.alertas && data.alertas.length > 0 && (
        <div className="space-y-2">
          {data.alertas.map((alerta, i) => (
            <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
              alerta.tipo === 'inadimplencia' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {alerta.mensagem}
              {alerta.valor != null && ` — ${formatMoney(alerta.valor)}`}
            </div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Receita do Mês"
          value={formatMoney(kpis?.receita_mes || 0)}
          subtitle={`Pendente: ${formatMoney(kpis?.receita_pendente || 0)}`}
          colorClass="kpi-blue"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KPICard
          title="Lucro Líquido"
          value={formatMoney(kpis?.lucro_liquido || 0)}
          subtitle={`Custo: ${formatMoney(kpis?.custo_manutencao_mes || 0)}`}
          colorClass="kpi-green"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <KPICard
          title="Ocupação da Frota"
          value={`${kpis?.ocupacao_frota || 0}%`}
          subtitle={`${kpis?.maquinas_locadas || 0} de ${kpis?.total_maquinas || 0} máquinas`}
          colorClass="kpi-purple"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9" /></svg>}
        />
        <KPICard
          title="Inadimplência"
          value={formatMoney(kpis?.inadimplencia || 0)}
          subtitle="Total vencido em aberto"
          colorClass="kpi-red"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash flow chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">Fluxo de Caixa</h3>
              <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-blue-500 rounded-full inline-block" />Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-red-400 rounded-full inline-block" />Saídas</span>
            </div>
          </div>
          <CashFlowChart data={data?.fluxo_mensal || []} />
        </div>

        {/* Machine status donut */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Status da Frota</h3>
            <p className="text-xs text-muted-foreground">{kpis?.total_maquinas || 0} máquinas no total</p>
          </div>
          {donutData.length > 0 ? (
            <MachineDonut data={donutData} />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Nenhuma máquina cadastrada
            </div>
          )}
          {/* Quick stats */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-xl font-bold text-green-700">{kpis?.maquinas_disponiveis || 0}</p>
              <p className="text-xs text-green-600">Disponíveis</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-700">{kpis?.maquinas_locadas || 0}</p>
              <p className="text-xs text-blue-600">Locadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
