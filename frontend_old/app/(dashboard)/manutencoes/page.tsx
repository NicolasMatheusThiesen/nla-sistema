'use client';

import { useState } from 'react';
import { useManutencoes, useCreateManutencao, useUpdateManutencao, useDeleteManutencao, useMaquinas, useClientes, useMateriais, useServicos, type Manutencao } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm, useFieldArray } from 'react-hook-form';

function ManutencaoModal({ open, onClose, manutencao }: { open: boolean; onClose: () => void; manutencao?: Manutencao }) {
  if (typeof window !== 'undefined') {
    (window as any).__renderCounter = ((window as any).__renderCounter || 0) + 1;
    if ((window as any).__renderCounter > 50) {
      throw new Error('INFINITE LOOP DETECTED IN ManutencaoModal! Counter exceeded 50.');
    }
  }

  const { data: maquinas } = useMaquinas();
  const { data: clientes } = useClientes();
  const { data: materiaisData } = useMateriais({ ativo: 'true' });
  const { data: servicosData } = useServicos({ search: '' }); // Fetch active
  
  const createMut = useCreateManutencao();
  const updateMut = useUpdateManutencao(manutencao?.id || '');

  const defaultValues = manutencao ? {
    ...manutencao,
    is_terceiro: String(manutencao.is_terceiro || 'false'),
    maquina_id: manutencao.maquina_id || '',
    cliente_id: manutencao.cliente_id || '',
    maquina_terceiro_descricao: manutencao.maquina_terceiro_descricao || '',
    custo: String(manutencao.custo || '0'),
    materiais: manutencao.manutencao_materiais?.map(m => ({
      material_id: m.material_id, quantidade: String(m.quantidade), valor_unitario: String(m.valor_unitario), valor_total: String(m.valor_total)
    })) || [],
    servicos: manutencao.manutencao_servicos?.map(s => ({
      servico_id: s.servico_id, quantidade: String(s.quantidade), valor_unitario: String(s.valor_unitario), valor_total: String(s.valor_total)
    })) || []
  } : { 
    tipo: 'preventiva', 
    status: 'concluida', 
    custo: '0', 
    data_inicio: new Date().toISOString().split('T')[0],
    is_terceiro: 'false',
    materiais: [],
    servicos: []
  };

  const { register, handleSubmit, reset, watch, control, setValue } = useForm<any>({ defaultValues });

  const isTerceiro = watch('is_terceiro') === 'true';

  const { fields: materiaisFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({ control, name: "materiais" });
  const { fields: servicosFields, append: appendServico, remove: removeServico } = useFieldArray({ control, name: "servicos" });

  const watchMateriais = watch("materiais");
  const watchServicos = watch("servicos");

  const calcMaterialTotal = (index: number) => {
    const qtd = parseFloat(watchMateriais[index]?.quantidade || '0');
    const unit = parseFloat(watchMateriais[index]?.valor_unitario || '0');
    setValue(`materiais.${index}.valor_total`, (qtd * unit).toFixed(2));
    updateTotalCusto();
  };

  const calcServicoTotal = (index: number) => {
    const qtd = parseFloat(watchServicos[index]?.quantidade || '0');
    const unit = parseFloat(watchServicos[index]?.valor_unitario || '0');
    setValue(`servicos.${index}.valor_total`, (qtd * unit).toFixed(2));
    updateTotalCusto();
  };

  const updateTotalCusto = () => {
    const mats = watch("materiais") || [];
    const servs = watch("servicos") || [];
    const matTotal = mats.reduce((s: number, m: any) => s + parseFloat(m.valor_total || '0'), 0);
    const servTotal = servs.reduce((s: number, x: any) => s + parseFloat(x.valor_total || '0'), 0);
    setValue('custo', (matTotal + servTotal).toFixed(2));
  };

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      is_terceiro: data.is_terceiro === 'true',
      maquina_id: data.is_terceiro === 'false' ? data.maquina_id : null,
      cliente_id: data.is_terceiro === 'true' ? data.cliente_id : null,
      custo: parseFloat(String(data.custo)),
      materiais: data.materiais.map((m: any) => ({
        material_id: m.material_id, quantidade: parseFloat(String(m.quantidade)), valor_unitario: parseFloat(String(m.valor_unitario)), valor_total: parseFloat(String(m.valor_total)),
      })),
      servicos: data.servicos.map((s: any) => ({
        servico_id: s.servico_id, quantidade: parseFloat(String(s.quantidade)), valor_unitario: parseFloat(String(s.valor_unitario)), valor_total: parseFloat(String(s.valor_total)),
      }))
    };
    try {
      if (manutencao) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={manutencao ? "Editar Manutenção" : "Registrar Manutenção"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Identificação */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Identificação do Equipamento</h3>
          
          {/*
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="false" {...register('is_terceiro')} className="accent-primary" />
              <span className="text-sm font-medium">Máquina Própria (Frota)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value="true" {...register('is_terceiro')} className="accent-primary" />
              <span className="text-sm font-medium">Máquina de Terceiro/Cliente</span>
            </label>
          </div>

          {!isTerceiro ? (
            <div className="grid grid-cols-1">
              <Select label="Máquina da Frota*" options={(maquinas || []).map(m => ({ value: m.id as string, label: `${m.nome} — ${m.modelo || ''}` }))} {...register('maquina_id', { required: !isTerceiro })} placeholder="Selecione a máquina..." />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Cliente Proprietário*" options={(clientes || []).map(c => ({ value: c.id, label: c.razao_social }))} {...register('cliente_id', { required: isTerceiro })} placeholder="Selecione o cliente..." />
              <Input label="Descrição do Equipamento*" placeholder="Ex: Betoneira CSM 400L" {...register('maquina_terceiro_descricao', { required: isTerceiro })} />
            </div>
          )}
          */}
        </div>

        {/* Dados da OS */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Dados do Serviço</h3>
          {/*
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo*" options={[{ value: 'preventiva', label: 'Preventiva' }, { value: 'corretiva', label: 'Corretiva' }, { value: 'reforma', label: 'Reforma' }]} {...register('tipo', { required: true })} />
            <Select label="Status*" options={[{ value: 'agendada', label: 'Agendada' }, { value: 'em_andamento', label: 'Em Andamento' }, { value: 'concluida', label: 'Concluída' }]} {...register('status')} />
            <Input label="Data de Início*" type="date" {...register('data_inicio', { required: true })} />
            <Input label="Data de Fim" type="date" {...register('data_fim')} />
            <Input label="Fornecedor/Oficina" {...register('fornecedor')} />
            <Input label="Próxima Manutenção" type="date" {...register('proxima_manutencao')} />
          </div>
          */}
        </div>

        {/* Serviços */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">Serviços Realizados</h3>
            {/*
            <Button type="button" size="sm" variant="outline" onClick={() => appendServico({ servico_id: '', quantidade: '1', valor_unitario: '0', valor_total: '0' })}>
              + Adicionar Serviço
            </Button>
            */}
          </div>
          {/*
          {servicosFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1">
                <Select label="Serviço" options={(servicosData || []).filter(s => s.ativo).map(s => ({ value: s.id, label: s.nome }))} 
                  {...register(`servicos.${index}.servico_id` as const, { required: true })}
                  onChange={(e) => {
                    const servId = e.target.value;
                    const serv = servicosData?.find(s => s.id === servId);
                    if (serv) {
                      setValue(`servicos.${index}.valor_unitario`, serv.valor_padrao);
                      calcServicoTotal(index);
                    }
                  }}
                />
              </div>
              <div className="w-24">
                <Input label="Qtd" type="number" step="0.01" {...register(`servicos.${index}.quantidade` as const)} onChange={(e) => { register(`servicos.${index}.quantidade`).onChange(e); calcServicoTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Unitário (R$)" type="number" step="0.01" {...register(`servicos.${index}.valor_unitario` as const)} onChange={(e) => { register(`servicos.${index}.valor_unitario`).onChange(e); calcServicoTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Total (R$)" type="number" step="0.01" {...register(`servicos.${index}.valor_total` as const)} readOnly className="bg-muted" />
              </div>
              <Button type="button" variant="ghost" onClick={() => { removeServico(index); setTimeout(updateTotalCusto, 50); }} className="text-red-500 hover:text-red-700 h-9 mb-1">
                Remover
              </Button>
            </div>
          ))}
          */}
        </div>

        {/* Peças / Materiais */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-semibold text-foreground">Peças e Materiais Aplicados</h3>
            {/*
            <Button type="button" size="sm" variant="outline" onClick={() => appendMaterial({ material_id: '', quantidade: '1', valor_unitario: '0', valor_total: '0' })}>
              + Adicionar Peça/Material
            </Button>
            */}
          </div>
          {/*
          {materiaisFields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1">
                <Select label="Peça/Material" options={(materiaisData || []).filter(m => m.finalidade !== 'revenda').map(m => ({ value: m.id, label: `${m.nome} (Est.: ${m.quantidade_estoque})` }))} 
                  {...register(`materiais.${index}.material_id` as const, { required: true })}
                  onChange={(e) => {
                    const matId = e.target.value;
                    const mat = materiaisData?.find(m => m.id === matId);
                    if (mat) {
                      setValue(`materiais.${index}.valor_unitario`, mat.custo_unitario);
                      calcMaterialTotal(index);
                    }
                  }}
                />
              </div>
              <div className="w-24">
                <Input label="Qtd" type="number" step="0.01" {...register(`materiais.${index}.quantidade` as const)} onChange={(e) => { register(`materiais.${index}.quantidade`).onChange(e); calcMaterialTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Custo Unit.(R$)" type="number" step="0.01" {...register(`materiais.${index}.valor_unitario` as const)} onChange={(e) => { register(`materiais.${index}.valor_unitario`).onChange(e); calcMaterialTotal(index); }} />
              </div>
              <div className="w-32">
                <Input label="Custo Tot.(R$)" type="number" step="0.01" {...register(`materiais.${index}.valor_total` as const)} readOnly className="bg-muted" />
              </div>
              <Button type="button" variant="ghost" onClick={() => { removeMaterial(index); setTimeout(updateTotalCusto, 50); }} className="text-red-500 hover:text-red-700 h-9 mb-1">
                Remover
              </Button>
            </div>
          ))}
          */}
        </div>

        {/* Resumo */}
        <div className="space-y-4 border-t pt-4">
          {/*
          <Input label="Custo Total (R$)" type="number" step="0.01" {...register('custo')} />
          <Textarea label="Descrição do Serviço Manual" {...register('descricao')} rows={2} placeholder="Descreva o serviço realizado se não cadastrado..." />
          <Textarea label="Peças Trocadas Manual" {...register('pecas_trocadas')} rows={2} placeholder="Liste peças que não estão no cadastro..." />
          */}
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>{manutencao ? 'Salvar Alterações' : 'Registrar Manutenção'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ManutencoesPage() {
  const [tipoFilter, setTipoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editManutencao, setEditManutencao] = useState<Manutencao | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [manutencaoToDelete, setManutencaoToDelete] = useState<string | null>(null);

  const { data: manutencoes, isLoading } = useManutencoes({ ...(tipoFilter && { tipo: tipoFilter }), ...(statusFilter && { status: statusFilter }) });
  const deleteMut = useDeleteManutencao();

  const totalCusto = manutencoes?.reduce((s, m) => s + (m.custo || 0), 0) || 0;
  const agendadas = manutencoes?.filter(m => m.status === 'agendada').length || 0;

  const openCreate = () => { setEditManutencao(undefined); setModalOpen(true); };
  const openEdit = (m: Manutencao) => { setEditManutencao(m); setModalOpen(true); };

  const confirmDelete = async () => {
    if (manutencaoToDelete) {
      await deleteMut.mutateAsync(manutencaoToDelete);
      setDeleteConfirmOpen(false);
      setManutencaoToDelete(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ordens de Serviço e Manutenções</h1>
          <p className="text-muted-foreground text-sm">Registre e acompanhe serviços em equipamentos próprios e de terceiros.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total de Registros</p>
          <p className="text-2xl font-bold">{manutencoes?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Custo/Valor Total</p>
          <p className="text-2xl font-bold text-red-600">{formatMoney(totalCusto)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Agendadas</p>
          <p className="text-2xl font-bold text-amber-600">{agendadas}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[{ value: '', label: 'Todos' }, { value: 'preventiva', label: 'Preventiva' }, { value: 'corretiva', label: 'Corretiva' }, { value: 'reforma', label: 'Reforma' }].map(o => (
            <button key={o.value} onClick={() => setTipoFilter(o.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tipoFilter === o.value ? 'bg-primary text-white' : 'bg-white border border-border hover:bg-muted'}`}>{o.label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          {[{ value: '', label: 'Todos' }, { value: 'agendada', label: 'Agendada' }, { value: 'em_andamento', label: 'Em Andamento' }, { value: 'concluida', label: 'Concluída' }].map(o => (
            <button key={o.value} onClick={() => setStatusFilter(o.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === o.value ? 'bg-primary text-white' : 'bg-white border border-border hover:bg-muted'}`}>{o.label}</button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Registrar OS
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : manutencoes?.length === 0 ? (
          <EmptyState title="Nenhuma OS registrada" description="Registre a primeira manutenção." action={<Button onClick={openCreate}>Registrar</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr><th>Equipamento</th><th>Tipo</th><th>Proprietário</th><th>Data</th><th>Status</th><th>Custo/Valor</th><th>Ações</th></tr>
            </thead>
            <tbody>
              {manutencoes?.map(m => (
                <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td>
                    {m.is_terceiro ? (
                      <p className="font-medium text-sm text-blue-700">{m.maquina_terceiro_descricao} (Terceiro)</p>
                    ) : (
                      <p className="font-medium text-sm">{m.maquinas?.nome} {m.maquinas?.modelo ? `- ${m.maquinas.modelo}` : ''}</p>
                    )}
                  </td>
                  <td><span className={getStatusColor(m.tipo)}>{getStatusLabel(m.tipo)}</span></td>
                  <td className="text-sm">{m.is_terceiro ? m.clientes?.razao_social : 'NLA Equipamentos (Frota)'}</td>
                  <td className="text-sm">{formatDate(m.data_inicio)}</td>
                  <td><span className={getStatusColor(m.status)}>{getStatusLabel(m.status)}</span></td>
                  <td className="font-bold text-red-600 text-sm">{formatMoney(m.custo)}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>Editar</Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => { setManutencaoToDelete(m.id); setDeleteConfirmOpen(true); }}>Excluir</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <ManutencaoModal open={modalOpen} onClose={() => setModalOpen(false)} manutencao={editManutencao} />}

      <ConfirmDialog 
        open={deleteConfirmOpen} 
        onClose={() => setDeleteConfirmOpen(false)} 
        onConfirm={confirmDelete} 
        title="Excluir OS/Manutenção" 
        description="Tem certeza que deseja excluir este registro?"
      />
    </div>
  );
}
