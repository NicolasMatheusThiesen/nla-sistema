

import { useState } from 'react';
import { useTiposEquipamento, useCreateTipoEquipamento, useUpdateTipoEquipamento, type TipoEquipamento } from '@/hooks/useApi';
import { Button, Modal, Input, Select, EmptyState, Skeleton, Textarea } from '@/components/ui';
import { useForm } from 'react-hook-form';

function TipoRow({ tipo, onEdit }: { tipo: TipoEquipamento; onEdit: () => void }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium text-sm">{tipo.nome}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{tipo.descricao || '-'}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tipo.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {tipo.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      </td>
    </tr>
  );
}

function TipoModal({ open, onClose, tipo }: { open: boolean; onClose: () => void; tipo?: TipoEquipamento }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: tipo ? { ...tipo } : { ativo: true },
  });

  const createMut = useCreateTipoEquipamento();
  const updateMut = useUpdateTipoEquipamento(tipo?.id || '');

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      ativo: String(data.ativo) === 'true'
    };
    try {
      if (tipo) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={tipo ? 'Editar Tipo' : 'Novo Tipo'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome do Tipo*" {...register('nome', { required: 'Obrigatório' })} error={errors.nome?.message as string} />
        
        <Textarea label="Descrição" {...register('descricao')} rows={2} />

        <Select label="Status" options={[
          { value: 'true', label: 'Ativo' },
          { value: 'false', label: 'Inativo' },
        ]} {...register('ativo')} />

        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function TiposEquipamentoPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTipo, setEditTipo] = useState<TipoEquipamento | undefined>();

  const { data: tipos, isLoading } = useTiposEquipamento({ ...(search && { search }) });

  const openCreate = () => { setEditTipo(undefined); setModalOpen(true); };
  const openEdit = (t: TipoEquipamento) => { setEditTipo(t); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tipos de Equipamento</h1>
          <p className="text-muted-foreground text-sm">Gerencie os tipos/categorias de máquinas.</p>
        </div>
        <Button onClick={openCreate}>Novo Tipo</Button>
      </div>

      <div className="flex gap-3">
        <Input 
          placeholder="Buscar por nome..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="max-w-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : tipos?.length === 0 ? (
          <EmptyState title="Nenhum tipo encontrado" description="Cadastre o primeiro tipo de equipamento." action={<Button onClick={openCreate}>Cadastrar</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Nome</th><th>Descrição</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos?.map(t => <TipoRow key={t.id} tipo={t} onEdit={() => openEdit(t)} />)}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <TipoModal open={modalOpen} onClose={() => setModalOpen(false)} tipo={editTipo} />}
    </div>
  );
}
