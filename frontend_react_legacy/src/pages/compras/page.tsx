

import { useState } from 'react';
import { useCompras, useCreateCompra, useDeleteCompra, useMateriais, useFornecedores, type Compra } from '@/hooks/useApi';
import { formatMoney, formatDate } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm } from 'react-hook-form';

function CompraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: materiaisDb } = useMateriais();
  const { data: fornecedores } = useFornecedores({ ativo: 'true' });
  const createMut = useCreateCompra();

  const { register, handleSubmit, watch, reset, setValue } = useForm<any>({
    defaultValues: {
      finalidade: 'consumo',
      data_compra: new Date().toISOString().split('T')[0],
      quantidade: '1',
      valor_unitario: '0',
    }
  });

  const finalidade = watch('finalidade');
  const qtd = parseFloat(watch('quantidade')) || 0;
  const unit = parseFloat(watch('valor_unitario')) || 0;
  const total = (qtd * unit).toFixed(2);

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      quantidade: parseFloat(String(data.quantidade)),
      valor_unitario: parseFloat(String(data.valor_unitario)),
      valor_total: parseFloat(total)
    };
    try {
      await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Compra" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-3">
          {(['consumo', 'revenda'] as const).map(f => (
            <label key={f} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${watch('finalidade') === f ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>
              <input type="radio" value={f} {...register('finalidade')} className="hidden" />
              <span className="font-medium text-sm capitalize">{f}</span>
            </label>
          ))}
        </div>

        <Input label="Descrição da Compra*" {...register('descricao', { required: true })} placeholder="Ex: Óleo de motor 5W40..." />
        <Select
          label="Fornecedor (Opcional)"
          options={(fornecedores || []).map(f => ({ value: f.id, label: f.razao_social }))}
          placeholder="Selecione o fornecedor..."
          {...register('fornecedor_id')}
        />

        {finalidade === 'revenda' && (
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-2">
            <p className="text-xs text-blue-800 mb-2">Selecione o material para atualizar o estoque automaticamente após a compra.</p>
            <Select
              label="Material associado"
              options={(materiaisDb || []).map(m => ({ value: m.id, label: m.nome }))}
              {...register('material_id')}
              placeholder="Vincular ao estoque..."
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Quantidade*" type="number" step="0.01" {...register('quantidade', { required: true })} />
          <Input label="Valor Unitário (R$)*" type="number" step="0.01" {...register('valor_unitario', { required: true })} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground">Valor Total (R$)</label>
            <p className="text-lg font-bold text-red-600 mt-1">R$ {total}</p>
          </div>
          <Input label="Data da Compra*" type="date" {...register('data_compra', { required: true })} />
        </div>

        <Input label="Nota Fiscal / Recibo" {...register('nota_fiscal')} />
        <Textarea label="Observações" {...register('observacoes')} rows={2} />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending}>Registrar Compra</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ComprasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [finalidadeFilter, setFinalidadeFilter] = useState('');

  const { data: compras, isLoading } = useCompras({ ...(finalidadeFilter && { finalidade: finalidadeFilter }) });
  const deleteMut = useDeleteCompra();

  const openCreate = () => { setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[{ value: '', label: 'Todas' }, { value: 'consumo', label: 'Consumo' }, { value: 'revenda', label: 'Revenda' }].map(opt => (
            <button key={opt.value} onClick={() => setFinalidadeFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${finalidadeFilter === opt.value ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}>Registrar Compra</Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : compras?.length === 0 ? (
          <EmptyState title="Nenhuma compra registrada" description="Nenhuma compra encontrada." action={<Button onClick={openCreate}>Registrar</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr><th>Data</th><th>Descrição</th><th>Fornecedor</th><th>Qtd x Unitário</th><th>Total</th><th>Finalidade</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {compras?.map(c => (
                <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td>{formatDate(c.data_compra)}</td>
                  <td>
                    <p className="font-medium text-sm">{c.descricao}</p>
                    {c.nota_fiscal && <p className="text-xs text-muted-foreground">NF: {c.nota_fiscal}</p>}
                  </td>
                  <td>{c.fornecedores?.razao_social || '-'}</td>
                  <td className="text-sm">{c.quantidade}x {formatMoney(c.valor_unitario)}</td>
                  <td className="font-bold text-red-600">{formatMoney(c.valor_total)}</td>
                  <td>
                    <span className={c.finalidade === 'consumo' ? 'badge-blue' : 'badge-orange'}>
                      {c.finalidade}
                    </span>
                  </td>
                  <td>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(c.id)}>Remover</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <CompraModal open={modalOpen} onClose={() => setModalOpen(false)} />}

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)} loading={deleteMut.isPending}
        title="Remover Compra?" description="Esta ação não pode ser desfeita e removerá o lançamento do financeiro."
        onConfirm={async () => { if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
