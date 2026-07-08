'use client';

import { useState } from 'react';
import { useVendedores, useCreateVendedor, useUpdateVendedor, useDeleteVendedor, type Vendedor } from '@/hooks/useApi';
import { formatMoney } from '@/lib/utils';
import { Button, Modal, Input, Select, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm } from 'react-hook-form';

type VendedorForm = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  percentual_comissao_padrao: string;
  ativo: string;
};

function VendedorModal({ open, onClose, vendedor }: { open: boolean; onClose: () => void; vendedor?: Vendedor }) {
  const createMut = useCreateVendedor();
  const updateMut = useUpdateVendedor(vendedor?.id || '');
  const isEdit = !!vendedor;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<VendedorForm>({
    defaultValues: {
      nome: vendedor?.nome || '',
      cpf: vendedor?.cpf || '',
      email: vendedor?.email || '',
      telefone: vendedor?.telefone || '',
      percentual_comissao_padrao: String(vendedor?.percentual_comissao_padrao ?? ''),
      ativo: String(vendedor?.ativo ?? true),
    },
  });

  const onSubmit = async (data: VendedorForm) => {
    const payload = { 
      ...data, 
      percentual_comissao_padrao: parseFloat(data.percentual_comissao_padrao) || 0,
      ativo: data.ativo === 'true'
    };
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload);
      } else {
        await createMut.mutateAsync(payload);
      }
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Vendedor' : 'Novo Vendedor'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome completo *"
          placeholder="Ex: João da Silva"
          error={errors.nome?.message}
          {...register('nome', { required: 'Nome obrigatório' })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="CPF" placeholder="000.000.000-00" {...register('cpf')} />
          <Input
            label="% Comissão Padrão"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder="Ex: 5"
            {...register('percentual_comissao_padrao')}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="E-mail" type="email" placeholder="vendedor@email.com" {...register('email')} />
          <Input label="Telefone" placeholder="(47) 99999-9999" {...register('telefone')} />
        </div>

        {/* Preview da comissão */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-2">
          <span className="font-semibold">💡 Dica:</span> O % de comissão padrão será preenchido automaticamente ao selecionar este vendedor em vendas e contratos (editável por negociação).
        </div>

        <Select label="Status" options={[
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' },
        ]} {...register('ativo')} />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isPending}>{isEdit ? 'Salvar Alterações' : 'Cadastrar Vendedor'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function VendedoresPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendedor, setEditVendedor] = useState<Vendedor | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { data: vendedores, isLoading } = useVendedores();
  const deleteMut = useDeleteVendedor();

  const handleEdit = (v: Vendedor) => { setEditVendedor(v); setModalOpen(true); };
  const handleNew = () => { setEditVendedor(undefined); setModalOpen(true); };
  const handleDelete = async () => {
    if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendedores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{vendedores?.length || 0} vendedor(es) cadastrado(s)</p>
        </div>
        <Button onClick={handleNew}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Novo Vendedor
        </Button>
      </div>

      {/* KPIs */}
      {vendedores && vendedores.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="kpi-blue rounded-2xl p-4 text-white">
            <p className="text-sm text-white/80">Total de Vendedores</p>
            <p className="text-2xl font-bold">{vendedores.filter(v => v.ativo).length}</p>
            <p className="text-xs text-white/60">ativos</p>
          </div>
          <div className="kpi-green rounded-2xl p-4 text-white">
            <p className="text-sm text-white/80">Média % Comissão</p>
            <p className="text-2xl font-bold">
              {(vendedores.reduce((s, v) => s + v.percentual_comissao_padrao, 0) / Math.max(vendedores.length, 1)).toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Inativos</p>
            <p className="text-2xl font-bold">{vendedores.filter(v => !v.ativo).length}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : vendedores?.length === 0 ? (
          <EmptyState
            title="Nenhum vendedor cadastrado"
            description="Cadastre vendedores para vincular comissões em vendas e contratos."
            action={<Button onClick={handleNew}>Cadastrar Vendedor</Button>}
          />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>% Comissão</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores?.map(v => (
                <tr key={v.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td><p className="font-medium">{v.nome}</p></td>
                  <td className="text-muted-foreground">{v.cpf || '—'}</td>
                  <td>{v.telefone || '—'}</td>
                  <td>{v.email || '—'}</td>
                  <td>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                      {v.percentual_comissao_padrao}%
                    </span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${v.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(v)}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(v.id)}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <VendedorModal open={modalOpen} onClose={() => setModalOpen(false)} vendedor={editVendedor} />}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Desativar vendedor?"
        description="O vendedor será desativado. Seus registros de comissão anteriores serão mantidos."
        loading={deleteMut.isPending}
      />
    </div>
  );
}
