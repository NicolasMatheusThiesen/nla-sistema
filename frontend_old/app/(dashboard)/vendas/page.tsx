'use client';

import { useState } from 'react';
import { useVendas, useCreateVenda, useUpdateVenda, useDeleteVenda, useMaquinas, useClientes, useVendedores, useMateriais, type Venda } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm, useFieldArray } from 'react-hook-form';

function VendaModal({ open, onClose, venda }: { open: boolean; onClose: () => void; venda?: Venda }) {
  const { data: maquinas } = useMaquinas({ status: 'disponivel' });
  const { data: clientes } = useClientes();
  const { data: vendedores } = useVendedores({ ativo: 'true' });
  const { data: materiaisData } = useMateriais({ ativo: 'true' });
  
  const createMut = useCreateVenda();
  const updateMut = useUpdateVenda(venda?.id || '');

  const defaultValues = venda ? {
    ...venda,
    maquina_id: venda.maquina_id || '',
    vendedor_id: venda.vendedor_id || '',
    valor_venda: String(venda.valor_venda),
    numero_parcelas: String(venda.numero_parcelas),
    data_venda: venda.data_venda,
    percentual_comissao: String(venda.percentual_comissao || '0'),
    valor_comissao: String(venda.valor_comissao || '0'),
    tipo_comissao: venda.tipo_comissao || 'percentual',
    materiais: venda.venda_materiais?.map(vm => ({
      material_id: vm.material_id,
      quantidade: String(vm.quantidade),
      valor_unitario: String(vm.valor_unitario),
      valor_total: String(vm.valor_total)
    })) || []
  } : {
    forma_pagamento: 'avista',
    numero_parcelas: '1',
    data_venda: new Date().toISOString().split('T')[0],
    percentual_comissao: '0',
    valor_comissao: '0',
    tipo_comissao: 'percentual',
    materiais: []
  };

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<any>({ defaultValues });
  
  const { fields: materiaisFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control,
    name: "materiais"
  });

  const watchMateriais = watch("materiais");
  const valorVenda = watch('valor_venda');
  const percentualComissao = watch('percentual_comissao');
  const tipoComissao = watch('tipo_comissao');
  const isPercentual = tipoComissao === 'percentual';
  const valorComissaoPreview = isPercentual
    ? (valorVenda && percentualComissao ? (parseFloat(String(valorVenda)) * parseFloat(String(percentualComissao)) / 100).toFixed(2) : '0.00')
    : (parseFloat(String(watch('valor_comissao') || 0)) || 0).toFixed(2);

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      maquina_id: data.maquina_id || null,
      vendedor_id: data.vendedor_id || null,
      valor_venda: parseFloat(String(data.valor_venda)), 
      numero_parcelas: parseInt(String(data.numero_parcelas)),
      percentual_comissao: parseFloat(String(data.percentual_comissao)) || 0,
      tipo_comissao: data.tipo_comissao || 'percentual',
      valor_comissao: parseFloat(String(data.valor_comissao)) || 0,
      materiais: data.materiais.map((m: any) => ({
        material_id: m.material_id,
        quantidade: parseFloat(String(m.quantidade)),
        valor_unitario: parseFloat(String(m.valor_unitario)),
        valor_total: parseFloat(String(m.valor_total)),
      }))
    };
    
    try {
      if (venda) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const calcMaterialTotal = (index: number) => {
    const qtd = parseFloat(watchMateriais[index]?.quantidade || '0');
    const unit = parseFloat(watchMateriais[index]?.valor_unitario || '0');
    setValue(`materiais.${index}.valor_total`, (qtd * unit).toFixed(2));
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={venda ? "Editar Venda" : "Registrar Venda"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Dados Básicos */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Informações Principais</h3>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Comprador*" options={(clientes || []).map(c => ({ value: c.id, label: c.razao_social }))} {...register('cliente_id', { required: true })} placeholder="Selecione o cliente..." />
            <Select label="Máquina (opcional se for só produto)" options={((venda && venda.maquinas) ? [venda.maquinas, ...(maquinas || [])] : (maquinas || [])).map(m => ({ value: m.id as string, label: `${m.nome} — ${m.modelo || ''}` }))} {...register('maquina_id')} placeholder="Nenhuma máquina (apenas produtos)" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Vendedor (opcional)" options={(vendedores || []).map(v => ({ value: v.id, label: v.nome }))} {...register('vendedor_id')} placeholder="Selecione o vendedor..." />
            <Input label="Data da Venda*" type="date" {...register('data_venda', { required: true })} />
          </div>
        </div>

        {/* Produtos / Materiais */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">Produtos Adicionais (Materiais)</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => appendMaterial({ material_id: '', quantidade: '1', valor_unitario: '0', valor_total: '0' })}>
              + Adicionar Produto
            </Button>
          </div>
          
          {materiaisFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1">
                <Select label="Produto" options={(materiaisData || []).filter(m => m.finalidade !== 'manutencao').map(m => ({ value: m.id, label: `${m.nome} (Estoque: ${m.quantidade_estoque})` }))} 
                  {...register(`materiais.${index}.material_id` as const, { required: true })}
                  onChange={(e) => {
                    const matId = e.target.value;
                    const mat = materiaisData?.find(m => m.id === matId);
                    if (mat) {
                      setValue(`materiais.${index}.valor_unitario`, mat.valor_venda);
                      calcMaterialTotal(index);
                    }
                  }}
                />
              </div>
              <div className="w-24">
                <Input label="Qtd" type="number" step="0.01" {...register(`materiais.${index}.quantidade` as const)} onChange={(e) => { register(`materiais.${index}.quantidade`).onChange(e); calcMaterialTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Unitário (R$)" type="number" step="0.01" {...register(`materiais.${index}.valor_unitario` as const)} onChange={(e) => { register(`materiais.${index}.valor_unitario`).onChange(e); calcMaterialTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Total (R$)" type="number" step="0.01" {...register(`materiais.${index}.valor_total` as const)} readOnly className="bg-muted" />
              </div>
              <Button type="button" variant="ghost" onClick={() => removeMaterial(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 mb-1">
                Remover
              </Button>
            </div>
          ))}
          {materiaisFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Nenhum produto adicionado nesta venda.</p>}
        </div>

        {/* Financeiro */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Financeiro & Pagamento</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Valor Total da Venda (R$)*" type="number" step="0.01" {...register('valor_venda', { required: true })} />
            <Select label="Tipo da Comissão" options={[{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }]} {...register('tipo_comissao')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {isPercentual ? (
              <Input label="Percentual Comissão (%)" type="number" step="0.01" min="0" max="100" {...register('percentual_comissao')} />
            ) : (
              <Input label="Valor Comissão (R$)" type="number" step="0.01" min="0" {...register('valor_comissao')} />
            )}
            <div />
          </div>

          <p className="text-sm font-medium text-green-600">Valor da comissão previsto: R$ {valorComissaoPreview}</p>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Forma de Pagamento*" options={[
              { value: 'avista', label: 'À Vista' }, { value: 'parcelado', label: 'Parcelado' }, { value: 'financiado', label: 'Financiado' },
            ]} {...register('forma_pagamento', { required: true })} />
            <Input label="Nº de Parcelas" type="number" min="1" {...register('numero_parcelas')} />
          </div>
        </div>

        <Textarea label="Observações" {...register('observacoes')} rows={2} />

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>{venda ? 'Salvar Alterações' : 'Registrar Venda'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function VendasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editVenda, setEditVenda] = useState<Venda | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vendaToDelete, setVendaToDelete] = useState<string | null>(null);

  const { data: vendas, isLoading } = useVendas();
  const deleteMut = useDeleteVenda();

  const totalVendas = vendas?.reduce((s, v) => s + v.valor_venda, 0) || 0;
  const lucroTotal = vendas?.reduce((s, v) => s + (v.valor_venda - v.valor_custo), 0) || 0;

  const openCreate = () => { setEditVenda(undefined); setModalOpen(true); };
  const openEdit = (v: Venda) => { setEditVenda(v); setModalOpen(true); };

  const confirmDelete = async () => {
    if (vendaToDelete) {
      await deleteMut.mutateAsync(vendaToDelete);
      setDeleteConfirmOpen(false);
      setVendaToDelete(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Vendas</h1>
          <p className="text-muted-foreground text-sm">Gerencie a venda de máquinas e produtos.</p>
        </div>
        <Button onClick={openCreate}>Registrar Venda</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi-blue rounded-2xl p-4 text-white">
          <p className="text-sm text-white/80">Total em Vendas</p>
          <p className="text-2xl font-bold">{formatMoney(totalVendas)}</p>
          <p className="text-xs text-white/60">{vendas?.length || 0} vendas realizadas</p>
        </div>
        <div className="kpi-green rounded-2xl p-4 text-white">
          <p className="text-sm text-white/80">Lucro nas Vendas</p>
          <p className="text-2xl font-bold">{formatMoney(lucroTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Margem Média</p>
          <p className="text-2xl font-bold">{totalVendas > 0 ? ((lucroTotal / totalVendas) * 100).toFixed(1) : 0}%</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : vendas?.length === 0 ? (
          <EmptyState title="Nenhuma venda registrada" description="Registre a primeira venda." action={<Button onClick={openCreate}>Registrar Venda</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Item(s) Vendido(s)</th>
                <th>Comprador</th>
                <th>Vendedor</th>
                <th>Data</th>
                <th>Valor Venda</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendas?.map(v => {
                const isOnlyProducts = !v.maquinas;
                return (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td>
                      {!isOnlyProducts && (
                        <div><p className="font-medium text-sm">{v.maquinas?.nome}</p><p className="text-xs text-muted-foreground">{v.maquinas?.modelo}</p></div>
                      )}
                      {v.venda_materiais && v.venda_materiais.length > 0 && (
                        <p className="text-xs text-blue-600 font-medium">+{v.venda_materiais.length} produto(s)</p>
                      )}
                      {isOnlyProducts && (!v.venda_materiais || v.venda_materiais.length === 0) && (
                        <p className="text-sm italic text-muted-foreground">Sem itens</p>
                      )}
                    </td>
                    <td className="text-sm">{v.clientes?.razao_social}</td>
                    <td className="text-sm">{v.vendedores?.nome || '-'}</td>
                    <td className="text-sm">{formatDate(v.data_venda)}</td>
                    <td className="font-bold text-green-600 text-sm">{formatMoney(v.valor_venda)}</td>
                    <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => { setVendaToDelete(v.id); setDeleteConfirmOpen(true); }}>Excluir</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <VendaModal open={modalOpen} onClose={() => setModalOpen(false)} venda={editVenda} />}

      <ConfirmDialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)} 
        onConfirm={confirmDelete} 
        title="Excluir Venda" 
        description="Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita e pode impactar o financeiro se o lançamento não for excluído manualmente."
      />
    </div>
  );
}
