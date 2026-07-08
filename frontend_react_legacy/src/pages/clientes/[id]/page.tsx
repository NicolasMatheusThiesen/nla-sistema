'use client';

import { useCliente } from '@/hooks/useApi';
import { formatMoney, formatDate, formatCPFCNPJ, formatPhone, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Card, CardHeader, CardTitle, CardContent, Skeleton } from '@/components/ui';
import { useParams, useNavigate, Link } from 'react-router-dom';

export default function ClienteDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: cliente, isLoading } = useCliente(id);

  if (isLoading) return (
    <div className="space-y-4 animate-fade-in">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
    </div>
  );

  if (!cliente) return <p className="text-muted-foreground">Cliente não encontrado.</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{cliente.razao_social}</h1>
            <span className={getStatusColor(cliente.status_credito)}>{getStatusLabel(cliente.status_credito)}</span>
          </div>
          {cliente.nome_fantasia && <p className="text-muted-foreground">{cliente.nome_fantasia}</p>}
          <p className="text-sm text-muted-foreground font-mono">{formatCPFCNPJ(cliente.cpf_cnpj)}</p>
        </div>
        <span className="badge-gray">{cliente.tipo_pessoa}</span>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Devido</p>
          <p className="text-xl font-bold text-amber-600">{formatMoney(cliente.financeiro.total_devido)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Pago</p>
          <p className="text-xl font-bold text-green-600">{formatMoney(cliente.financeiro.total_pago)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Inadimplência</p>
          <p className={`text-xl font-bold ${cliente.financeiro.inadimplencia > 0 ? 'text-red-600' : 'text-foreground'}`}>
            {formatMoney(cliente.financeiro.inadimplencia)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact info */}
        <Card>
          <CardHeader><CardTitle>Contato</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                { label: 'E-mail', value: cliente.email || '-' },
                { label: 'Telefone', value: formatPhone(cliente.telefone || '') },
                { label: 'Telefone 2', value: cliente.telefone2 ? formatPhone(cliente.telefone2) : '-' },
                { label: 'Contato Financeiro', value: cliente.contato_financeiro || '-' },
                { label: 'Tel. Financeiro', value: cliente.telefone_financeiro ? formatPhone(cliente.telefone_financeiro) : '-' },
                { label: 'Limite de Crédito', value: formatMoney(cliente.limite_credito) },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {[
                { label: 'CEP', value: cliente.cep || '-' },
                { label: 'Endereço', value: cliente.endereco ? `${cliente.endereco}, ${cliente.numero || 'S/N'}` : '-' },
                { label: 'Complemento', value: cliente.complemento || '-' },
                { label: 'Bairro', value: cliente.bairro || '-' },
                { label: 'Cidade/Estado', value: cliente.cidade ? `${cliente.cidade}/${cliente.estado}` : '-' },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </dl>
            {cliente.observacoes && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{cliente.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contracts */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Contratos</CardTitle>
          <span className="text-sm text-muted-foreground">{cliente.contratos?.length || 0} contratos</span>
        </CardHeader>
        <CardContent className="p-0">
          {cliente.contratos?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum contrato</p>
          ) : (
            <table className="w-full data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr><th>Número</th><th>Tipo</th><th>Início</th><th>Fim</th><th>Valor/mês</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {cliente.contratos?.map(c => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="font-mono font-bold text-primary">{c.numero}</td>
                    <td className="capitalize">{c.tipo_locacao}</td>
                    <td>{formatDate(c.data_inicio)}</td>
                    <td>{c.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}</td>
                    <td className="font-bold">{formatMoney(c.valor_mensal)}</td>
                    <td><span className={getStatusColor(c.status)}>{getStatusLabel(c.status)}</span></td>
                    <td><Link to={`/contratos/${c.id}`}><Button variant="ghost" size="sm">Ver</Button></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Last instalment */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Últimas Parcelas</CardTitle>
          <span className="text-sm text-muted-foreground">{cliente.parcelas?.length || 0} registros</span>
        </CardHeader>
        <CardContent className="p-0">
          {cliente.parcelas?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma parcela</p>
          ) : (
            <table className="w-full data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Pago em</th><th>Status</th></tr>
              </thead>
              <tbody>
                {cliente.parcelas?.slice(0, 12).map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td>{p.competencia}</td>
                    <td>{formatDate(p.data_vencimento)}</td>
                    <td className="font-medium">{formatMoney(p.valor)}</td>
                    <td>{p.data_pagamento ? formatDate(p.data_pagamento) : '-'}</td>
                    <td><span className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</span></td>
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
