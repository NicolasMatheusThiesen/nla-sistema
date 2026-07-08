'use client';

import { useContrato, usePagarParcela, type Parcela } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Skeleton, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

function PagarParcelaModal({ open, onClose, parcela, contratoId }: {
  open: boolean; onClose: () => void; parcela?: Parcela; contratoId: string;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: { valor_pago: parcela?.valor, data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento: 'pix' },
  });
  const pagarMut = usePagarParcela();

  const onSubmit = async (data: any) => {
    if (!parcela) return;
    await pagarMut.mutateAsync({ contratoId, parcelaId: parcela.id, data: { valor_pago: Number(data.valor_pago), data_pagamento: data.data_pagamento, forma_pagamento: data.forma_pagamento } });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pagamento" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">Parcela {parcela?.numero_parcela}</p>
          <p className="text-xs text-muted-foreground">Vencimento: {formatDate(parcela?.data_vencimento)}</p>
          <p className="text-lg font-bold text-primary">{formatMoney(parcela?.valor)}</p>
        </div>
        <Input label="Valor Pago (R$)" type="number" step="0.01" {...register('valor_pago')} />
        <Input label="Data de Pagamento" type="date" {...register('data_pagamento')} />
        <Select label="Forma de Pagamento" options={[
          { value: 'pix', label: 'PIX' }, { value: 'boleto', label: 'Boleto' },
          { value: 'transferencia', label: 'Transferência Bancária' },
          { value: 'dinheiro', label: 'Dinheiro' }, { value: 'cheque', label: 'Cheque' },
        ]} {...register('forma_pagamento')} />
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pagarMut.isPending}>Confirmar</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: contrato, isLoading } = useContrato(id);
  const [pagarParcela, setPagarParcela] = useState<Parcela | undefined>();

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-96" /></div>;
  if (!contrato) return <p className="text-muted-foreground">Contrato não encontrado.</p>;

  const parcelasPagas = contrato.parcelas?.filter(p => p.status === 'pago').length || 0;
  const valorTotal = contrato.parcelas?.reduce((s, p) => s + p.valor, 0) || 0;
  const valorRecebido = contrato.parcelas?.filter(p => p.status === 'pago').reduce((s, p) => s + (p.valor_pago || p.valor), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Contrato {contrato.numero}</h1>
            <span className={getStatusColor(contrato.status)}>{getStatusLabel(contrato.status)}</span>
          </div>
          <p className="text-muted-foreground">{contrato.clientes?.razao_social}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Valor Mensal', value: formatMoney(contrato.valor_mensal) },
          { label: 'Total Contratado', value: formatMoney(valorTotal) },
          { label: 'Total Recebido', value: formatMoney(valorRecebido), color: 'text-green-600' },
          { label: 'Parcelas Pagas', value: `${parcelasPagas}/${contrato.parcelas?.length || 0}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-border p-3 text-center">
            <p className={`text-xl font-bold ${s.color || 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Instalments table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle>Parcelas</CardTitle>
          <p className="text-sm text-muted-foreground">{contrato.parcelas?.length || 0} parcelas geradas</p>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr><th>Nº</th><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Valor Pago</th><th>Pagamento</th><th>Status</th><th>Ação</th></tr>
            </thead>
            <tbody>
              {contrato.parcelas?.map(p => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td>{p.numero_parcela}</td>
                  <td>{p.competencia}</td>
                  <td>{formatDate(p.data_vencimento)}</td>
                  <td className="font-medium">{formatMoney(p.valor)}</td>
                  <td className="text-green-600 font-medium">{p.valor_pago ? formatMoney(p.valor_pago) : '-'}</td>
                  <td>{p.data_pagamento ? formatDate(p.data_pagamento) : '-'}</td>
                  <td><span className={getStatusColor(p.status)}>{getStatusLabel(p.status)}</span></td>
                  <td>
                    {(p.status === 'pendente' || p.status === 'vencido') && (
                      <Button size="sm" onClick={() => setPagarParcela(p)}>Pagar</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {pagarParcela && (
        <PagarParcelaModal open={!!pagarParcela} onClose={() => setPagarParcela(undefined)} parcela={pagarParcela} contratoId={id} />
      )}
    </div>
  );
}
