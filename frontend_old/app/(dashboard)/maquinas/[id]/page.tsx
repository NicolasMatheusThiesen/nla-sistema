'use client';

import { useMaquina, useMaquinaRentabilidade } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/ui';
import { useParams, useRouter } from 'next/navigation';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function MaquinaDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: maquina, isLoading } = useMaquina(id);
  const { data: rentabilidade } = useMaquinaRentabilidade(id, 12);

  if (isLoading) return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-10 w-48" />
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
    </div>
  );

  if (!maquina) return <div className="text-muted-foreground">Máquina não encontrada.</div>;

  const rentData = rentabilidade ? [
    { name: 'Receita', valor: rentabilidade.receita_estimada, fill: '#22c55e' },
    { name: 'Custo', valor: rentabilidade.custo_total, fill: '#ef4444' },
    { name: 'Lucro', valor: Math.max(rentabilidade.lucro_liquido, 0), fill: '#3b82f6' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{maquina.nome}</h1>
          <p className="text-muted-foreground">{maquina.modelo} · {maquina.marca} · {maquina.ano_fabricacao}</p>
        </div>
        <span className={getStatusColor(maquina.status) + ' text-sm px-3 py-1 rounded-full font-medium'}>
          {getStatusLabel(maquina.status)}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Machine info */}
        <Card>
          <CardHeader><CardTitle>Informações Técnicas</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                { label: 'Tipo', value: getStatusLabel(maquina.tipo) },
                { label: 'Subtipo', value: maquina.subtipo ? getStatusLabel(maquina.subtipo) : '-' },
                { label: 'Nº Série', value: maquina.numero_serie || '-' },
                { label: 'Capacidade', value: maquina.capacidade_kg ? `${maquina.capacidade_kg} kg` : '-' },
                { label: 'Altura Máx.', value: maquina.altura_max_elevacao ? `${maquina.altura_max_elevacao} m` : '-' },
                { label: 'Aquisição', value: formatDate(maquina.data_aquisicao) },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Financial info */}
        <Card>
          <CardHeader><CardTitle>Dados Financeiros</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                { label: 'Valor de Aquisição', value: formatMoney(maquina.valor_aquisicao) },
                { label: 'Valor de Mercado', value: formatMoney(maquina.valor_mercado) },
                { label: 'Custo Mensal Est.', value: formatMoney(maquina.custo_mensal_estimado) },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
              <div className="border-t pt-3 mt-3">
                <p className="text-xs text-muted-foreground mb-2">Rentabilidade (12 meses)</p>
                {rentabilidade && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Receita Est.</span>
                      <span className="font-medium text-green-600">{formatMoney(rentabilidade.receita_estimada)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">ROI</span>
                      <span className={`font-bold ${rentabilidade.roi_percentual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {rentabilidade.roi_percentual.toFixed(1)}%
                      </span>
                    </div>
                    {rentabilidade.payback_meses && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payback Est.</span>
                        <span className="font-medium">{rentabilidade.payback_meses} meses</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Rentability Chart */}
        <Card>
          <CardHeader><CardTitle>Gráfico de Rentabilidade</CardTitle></CardHeader>
          <CardContent>
            {rentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={rentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v: number) => formatMoney(v)} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                    {rentData.map((entry, i) => (
                      <rect key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de rentabilidade</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance history */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Histórico de Manutenções</CardTitle>
          <span className="text-sm text-muted-foreground">{maquina.manutencoes?.length || 0} registros</span>
        </CardHeader>
        <CardContent>
          {maquina.manutencoes?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma manutenção registrada</p>
          ) : (
            <table className="w-full data-table">
              <thead>
                <tr className="border-b border-border">
                  <th>Data</th><th>Tipo</th><th>Fornecedor</th><th>Custo</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {maquina.manutencoes?.map((m) => (
                  <tr key={m.id} className="border-b border-border/50">
                    <td>{formatDate(m.data_inicio)}</td>
                    <td><span className={getStatusColor(m.tipo)}>{getStatusLabel(m.tipo)}</span></td>
                    <td>{m.fornecedor || '-'}</td>
                    <td className="font-medium">{formatMoney(m.custo)}</td>
                    <td><span className={getStatusColor(m.status)}>{getStatusLabel(m.status)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
