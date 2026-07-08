'use client';

import { useState } from 'react';
import { useOrdensServico, useCreateOrdemServico, useUpdateOrdemServico, useDeleteOrdemServico, useClientes, useMaquinas, useServicos, useMateriais, type OrdemServico, type OsServico, type OsMaterial } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog, Card, CardContent } from '@/components/ui';
import { useForm, useFieldArray } from 'react-hook-form';

function OrdemServicoModal({ open, onClose, os }: { open: boolean; onClose: () => void; os?: OrdemServico }) {
  const { data: clientes } = useClientes();
  const { data: maquinas } = useMaquinas();
  const { data: servicosDb } = useServicos();
  const { data: materiaisDb } = useMateriais();

  const createMut = useCreateOrdemServico();
  const updateMut = useUpdateOrdemServico(os?.id || '');

  const defaultValues = os ? {
    ...os,
    data_abertura: os.data_abertura.split('T')[0],
    data_conclusao: os.data_conclusao ? os.data_conclusao.split('T')[0] : '',
    servicos: os.os_servicos || [],
    materiais: os.os_materiais || [],
  } : {
    status: 'aberta',
    data_abertura: new Date().toISOString().split('T')[0],
    data_conclusao: '',
    servicos: [],
    materiais: [],
  };

  const { register, handleSubmit, control, watch, reset, setValue } = useForm<any>({ defaultValues });

  const { fields: servicosFields, append: appendServico, remove: removeServico } = useFieldArray({ control, name: 'servicos' });
  const { fields: materiaisFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({ control, name: 'materiais' });

  const watchedServicos = watch('servicos') || [];
  const watchedMateriais = watch('materiais') || [];

  const totalServicos = watchedServicos.reduce((sum: number, s: any) => sum + (parseFloat(s.valor_total) || 0), 0);
  const totalMateriais = watchedMateriais.reduce((sum: number, m: any) => sum + (parseFloat(m.valor_total) || 0), 0);
  const totalGeral = totalServicos + totalMateriais;

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      servicos: data.servicos.map((s: any) => ({
        ...s,
        quantidade: parseFloat(s.quantidade),
        valor_unitario: parseFloat(s.valor_unitario),
        valor_total: parseFloat(s.quantidade) * parseFloat(s.valor_unitario)
      })),
      materiais: data.materiais.map((m: any) => ({
        ...m,
        quantidade: parseFloat(m.quantidade),
        valor_unitario: parseFloat(m.valor_unitario),
        valor_total: parseFloat(m.quantidade) * parseFloat(m.valor_unitario)
      })),
    };

    try {
      if (os) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const handleServicoSelect = (id: string) => {
    if (!id) return;
    const servico = servicosDb?.find(s => s.id === id);
    if (servico) {
      appendServico({ servico_id: servico.id, quantidade: 1, valor_unitario: servico.valor_padrao, valor_total: servico.valor_padrao });
    }
  };

  const handleMaterialSelect = (id: string) => {
    if (!id) return;
    const material = materiaisDb?.find(m => m.id === id);
    if (material) {
      appendMaterial({ material_id: material.id, quantidade: 1, valor_unitario: material.valor_venda || material.custo_unitario, valor_total: material.valor_venda || material.custo_unitario });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={os ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Cliente*"
            options={(clientes || []).map(c => ({ value: c.id, label: c.razao_social }))}
            {...register('cliente_id', { required: true })}
          />
          <Select
            label="Máquina (Própria)"
            options={(maquinas || []).map(m => ({ value: m.id, label: `${m.nome} — ${m.modelo}` }))}
            {...register('maquina_id')}
            placeholder="Selecione caso a máquina seja nossa..."
          />
          <Input label="Máquina (Terceiro)" placeholder="Ex: Empilhadeira Cliente Y" {...register('maquina_terceiro_descricao')} />
          <Select
            label="Status"
            options={[
              { value: 'aberta', label: 'Aberta' },
              { value: 'em_andamento', label: 'Em Andamento' },
              { value: 'concluida', label: 'Concluída' },
              { value: 'cancelada', label: 'Cancelada' }
            ]}
            {...register('status')}
          />
          <Input label="Data Abertura*" type="date" {...register('data_abertura', { required: true })} />
          <Input label="Data Conclusão" type="date" {...register('data_conclusao')} />
        </div>

        <Textarea label="Descrição do Problema/Serviço" {...register('descricao')} rows={2} />

        {/* Serviços */}
        <div className="space-y-3 border p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Serviços Executados</h3>
            <Select 
              options={(servicosDb || []).map(s => ({ value: s.id, label: s.nome }))}
              onChange={e => handleServicoSelect(e.target.value)}
              placeholder="Adicionar serviço..."
              value=""
            />
          </div>
          {servicosFields.map((field, index) => {
            const serv = servicosDb?.find(s => s.id === watchedServicos[index]?.servico_id);
            return (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1"><Input label="Serviço" value={serv?.nome || ''} disabled /></div>
                <div className="w-24"><Input label="Qtd" type="number" step="0.01" {...register(`servicos.${index}.quantidade`)} onChange={e => {
                  const q = parseFloat(e.target.value) || 0;
                  const v = parseFloat(watchedServicos[index].valor_unitario) || 0;
                  setValue(`servicos.${index}.valor_total`, (q * v).toFixed(2));
                }} /></div>
                <div className="w-32"><Input label="Vlr Unit" type="number" step="0.01" {...register(`servicos.${index}.valor_unitario`)} onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  const q = parseFloat(watchedServicos[index].quantidade) || 0;
                  setValue(`servicos.${index}.valor_total`, (q * v).toFixed(2));
                }} /></div>
                <div className="w-32"><Input label="Total" type="number" step="0.01" {...register(`servicos.${index}.valor_total`)} disabled /></div>
                <Button type="button" variant="ghost" size="sm" className="text-red-500 mb-1" onClick={() => removeServico(index)}>X</Button>
              </div>
            );
          })}
        </div>

        {/* Materiais/Peças */}
        <div className="space-y-3 border p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Peças / Materiais</h3>
            <Select 
              options={(materiaisDb || []).map(m => ({ value: m.id, label: m.nome }))}
              onChange={e => handleMaterialSelect(e.target.value)}
              placeholder="Adicionar material..."
              value=""
            />
          </div>
          {materiaisFields.map((field, index) => {
            const mat = materiaisDb?.find(m => m.id === watchedMateriais[index]?.material_id);
            return (
              <div key={field.id} className="flex gap-2 items-end">
                <div className="flex-1"><Input label="Material" value={mat?.nome || ''} disabled /></div>
                <div className="w-24"><Input label="Qtd" type="number" step="0.01" {...register(`materiais.${index}.quantidade`)} onChange={e => {
                  const q = parseFloat(e.target.value) || 0;
                  const v = parseFloat(watchedMateriais[index].valor_unitario) || 0;
                  setValue(`materiais.${index}.valor_total`, (q * v).toFixed(2));
                }} /></div>
                <div className="w-32"><Input label="Vlr Unit" type="number" step="0.01" {...register(`materiais.${index}.valor_unitario`)} onChange={e => {
                  const v = parseFloat(e.target.value) || 0;
                  const q = parseFloat(watchedMateriais[index].quantidade) || 0;
                  setValue(`materiais.${index}.valor_total`, (q * v).toFixed(2));
                }} /></div>
                <div className="w-32"><Input label="Total" type="number" step="0.01" {...register(`materiais.${index}.valor_total`)} disabled /></div>
                <Button type="button" variant="ghost" size="sm" className="text-red-500 mb-1" onClick={() => removeMaterial(index)}>X</Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-6 text-right">
          <div><p className="text-sm text-muted-foreground">Total Serviços</p><p className="font-bold">{formatMoney(totalServicos)}</p></div>
          <div><p className="text-sm text-muted-foreground">Total Peças</p><p className="font-bold">{formatMoney(totalMateriais)}</p></div>
          <div><p className="text-sm text-primary font-bold">Total Geral</p><p className="text-xl font-bold text-primary">{formatMoney(totalGeral)}</p></div>
        </div>

        <Textarea label="Observações Internas" {...register('observacoes')} rows={2} />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending || updateMut.isPending}>Salvar OS</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function OrdensServicoPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editOs, setEditOs] = useState<OrdemServico | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: ordens, isLoading } = useOrdensServico({ ...(statusFilter && { status: statusFilter }) });
  const deleteMut = useDeleteOrdemServico();

  const openCreate = () => { setEditOs(undefined); setModalOpen(true); };
  const openEdit = (os: OrdemServico) => { setEditOs(os); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[{ value: '', label: 'Todas' }, { value: 'aberta', label: 'Abertas' }, { value: 'em_andamento', label: 'Em Andamento' }, { value: 'concluida', label: 'Concluídas' }].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === opt.value ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}>Nova Ordem de Serviço</Button>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : ordens?.length === 0 ? (
          <EmptyState title="Nenhuma OS encontrada" description="Crie a primeira Ordem de Serviço." action={<Button onClick={openCreate}>Nova OS</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr><th>Número</th><th>Status</th><th>Cliente</th><th>Máquina</th><th>Data</th><th>Valor Total</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {ordens?.map(os => (
                <tr key={os.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="font-bold text-primary">{os.numero}</td>
                  <td><span className={getStatusColor(os.status)}>{getStatusLabel(os.status)}</span></td>
                  <td>{os.clientes?.razao_social}</td>
                  <td>{os.maquinas ? `${os.maquinas.nome} (${os.maquinas.modelo})` : os.maquina_terceiro_descricao || '-'}</td>
                  <td>{formatDate(os.data_abertura)}</td>
                  <td className="font-bold text-green-600">{formatMoney(os.valor_total)}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(os)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteId(os.id)}>Remover</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <OrdemServicoModal open={modalOpen} onClose={() => setModalOpen(false)} os={editOs} />}

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)} loading={deleteMut.isPending}
        title="Remover Ordem de Serviço?" description="Esta ação não pode ser desfeita."
        onConfirm={async () => { if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); } }}
      />
    </div>
  );
}
