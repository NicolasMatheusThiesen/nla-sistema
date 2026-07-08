'use client';

import { useState } from 'react';
import { useLancamentos, useCreateLancamento, useUpdateLancamento, useDeleteLancamento, useCategorias, useMaquinas, useClientes, useFornecedores, type Lancamento } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel, getCurrentMonth } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog, Card, CardContent } from '@/components/ui';
import { useForm } from 'react-hook-form';

const formaOptions = [
  { value: 'pix', label: 'PIX' }, { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' }, { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' }, { value: 'cheque', label: 'Cheque' },
];

function LancamentoModal({ open, onClose, lancamento }: { open: boolean; onClose: () => void; lancamento?: Lancamento }) {
  const { data: categorias } = useCategorias();
  const { data: maquinas } = useMaquinas();
  const { data: clientes } = useClientes();
  const { data: fornecedores } = useFornecedores({ ativo: 'true' });
  const createMut = useCreateLancamento();
  const updateMut = useUpdateLancamento(lancamento?.id || '');

  const { register, handleSubmit, watch, reset } = useForm<any>({
    defaultValues: lancamento ? {
      ...lancamento,
      categoria_id: lancamento.categoria_id || '',
      cliente_id: lancamento.cliente_id || '',
      fornecedor_id: lancamento.fornecedor_id || '',
      maquina_id: lancamento.maquina_id || '',
      valor: String(lancamento.valor),
      numero_parcelas: 1,
    } : {
      tipo: 'despesa', status: 'pendente',
      data_competencia: new Date().toISOString().split('T')[0],
      recorrente: false,
      numero_parcelas: 1,
    },
  });

  const tipo = watch('tipo') as 'receita' | 'despesa';
  const catsFiltradas = (categorias || []).filter(c => c.tipo === tipo);

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      valor: parseFloat(String(data.valor)),
      numero_parcelas: parseInt(String(data.numero_parcelas)) || 1,
    };
    try {
      if (lancamento) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={lancamento ? 'Editar Lançamento' : 'Novo Lançamento'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-3">
          {(['receita', 'despesa'] as const).map(t => (
            <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${watch('tipo') === t ? (t === 'receita' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-border'}`}>
              <input type="radio" value={t} {...register('tipo')} className="hidden" />
              <span className="font-medium text-sm capitalize">{t === 'receita' ? '↑ Receita' : '↓ Despesa'}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Categoria"
            options={catsFiltradas.map(c => ({ value: c.id, label: c.nome }))}
            placeholder="Selecione a categoria..."
            {...register('categoria_id')}
          />
          {tipo === 'despesa' ? (
            <Select
              label="Fornecedor"
              options={(fornecedores || []).map(f => ({ value: f.id, label: f.razao_social }))}
              placeholder="Selecione o fornecedor..."
              {...register('fornecedor_id')}
            />
          ) : (
            <Select
              label="Cliente"
              options={(clientes || []).map(c => ({ value: c.id, label: c.razao_social }))}
              placeholder="Selecione o cliente..."
              {...register('cliente_id')}
            />
          )}
        </div>
        <Input label="Descrição*" {...register('descricao', { required: true })} placeholder="Descreva o lançamento..." />
        
        {!lancamento && (
          <div className="bg-muted/50 p-3 rounded-lg flex gap-4 items-center">
            <Input label="Parcelamento" type="number" min="1" max="120" {...register('numero_parcelas')} className="w-32" />
            <p className="text-xs text-muted-foreground pt-5">
              Se maior que 1, o sistema vai dividir esta mesma descrição e valor nos meses seguintes, baseando-se no vencimento.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Valor (R$)*" type="number" step="0.01" {...register('valor', { required: true })} />
          <Input label="Data de Competência*" type="date" {...register('data_competencia', { required: true })} />
          <Input label="Data de Vencimento" type="date" {...register('data_vencimento')} />
          <Input label="Data de Pagamento" type="date" {...register('data_pagamento')} />
          <Select label="Status" options={[
            { value: 'pendente', label: 'Pendente' }, { value: 'pago', label: 'Pago' },
            { value: 'vencido', label: 'Vencido' }, { value: 'cancelado', label: 'Cancelado' },
          ]} {...register('status')} />
          <Select label="Forma de Pagamento" options={formaOptions} placeholder="Selecione..." {...register('forma_pagamento')} />
        </div>
        <Textarea label="Observações" {...register('observacoes')} rows={2} />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>{lancamento ? 'Salvar' : 'Lançar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FinanceiroPage() {
  const [mesFilter, setMesFilter] = useState(getCurrentMonth());
  const [tipoFilter, setTipoFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editLancamento, setEditLancamento] = useState<Lancamento | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState('1');

  const { data: response, isLoading } = useLancamentos({
    ...(mesFilter && { mes: mesFilter }),
    ...(tipoFilter && { tipo: tipoFilter }),
    page,
  });
  const deleteMut = useDeleteLancamento();

  const lancamentos = response?.data || [];
  const receitas = lancamentos.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
  const despesas = lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
  const pendentes = lancamentos.filter(l => l.status === 'pendente').reduce((s, l) => s + l.valor, 0);

  const openCreate = () => { setEditLancamento(undefined); setModalOpen(true); };
  const openEdit = (l: Lancamento) => { setEditLancamento(l); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
          <p className="text-sm text-white/80">Entradas Pagas</p>
          <p className="text-2xl font-bold">{formatMoney(receitas)}</p>
        </div>
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-4 text-white">
          <p className="text-sm text-white/80">Saídas Pagas</p>
          <p className="text-2xl font-bold">{formatMoney(despesas)}</p>
        </div>
        <div className={`rounded-2xl p-4 text-white ${receitas - despesas >= 0 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}>
          <p className="text-sm text-white/80">Saldo do Período</p>
          <p className="text-2xl font-bold">{formatMoney(receitas - despesas)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="month"
          value={mesFilter}
          onChange={e => setMesFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          {[{ value: '', label: 'Todos' }, { value: 'receita', label: '↑ Receitas' }, { value: 'despesa', label: '↓ Despesas' }].map(opt => (
            <button key={opt.value} onClick={() => setTipoFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tipoFilter === opt.value ? 'bg-primary text-white' : 'bg-white border border-border hover:bg-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Lançamento
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : lancamentos.length === 0 ? (
          <EmptyState title="Nenhum lançamento no período" description="Clique em 'Novo Lançamento' para registrar." action={<Button onClick={openCreate}>Novo Lançamento</Button>} />
        ) : (
          <>
            <table className="w-full data-table">
              <thead className="border-b border-border bg-muted/30">
                <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Máquina</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Forma</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {lancamentos.map(l => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td>{formatDate(l.data_competencia)}</td>
                    <td>
                      <p className="font-medium text-sm">{l.descricao}</p>
                      {l.clientes && <p className="text-xs text-muted-foreground">{l.clientes.razao_social}</p>}
                    </td>
                    <td>
                      {l.categorias && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: l.categorias.cor + '20', color: l.categorias.cor }}>
                          {l.categorias.nome}
                        </span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">{l.maquinas?.nome || '-'}</td>
                    <td>
                      <span className={l.tipo === 'receita' ? 'badge-green' : 'badge-red'}>
                        {l.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                      </span>
                    </td>
                    <td className={`font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                      {l.tipo === 'receita' ? '+' : '-'}{formatMoney(l.valor)}
                    </td>
                    <td><span className={getStatusColor(l.status)}>{getStatusLabel(l.status)}</span></td>
                    <td className="text-xs text-muted-foreground capitalize">{l.forma_pagamento || '-'}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(l.id)}>Cancelar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            {response && response.total > response.limit && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Total: {response.total} lançamentos</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === '1'} onClick={() => setPage(p => String(parseInt(p) - 1))}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={parseInt(page) * response.limit >= response.total} onClick={() => setPage(p => String(parseInt(p) + 1))}>Próximo</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LancamentoModal open={modalOpen} onClose={() => setModalOpen(false)} lancamento={editLancamento} />
      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)} loading={deleteMut.isPending}
        title="Cancelar lançamento?" description="O lançamento será marcado como cancelado."
        onConfirm={async () => { if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
