

import { useState } from 'react';
import { useServicos, useCreateServico, useUpdateServico, type Servico } from '@/hooks/useApi';
import { Button, Modal, Input, Select, EmptyState, Skeleton, Textarea } from '@/components/ui';
import { useForm } from 'react-hook-form';

function ServicoRow({ servico, onEdit }: { servico: Servico; onEdit: () => void }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium text-sm">{servico.nome}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{servico.descricao || '-'}</td>
      <td className="px-4 py-3 text-sm font-medium">
        R$ {Number(servico.valor_padrao).toFixed(2)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${servico.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {servico.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      </td>
    </tr>
  );
}

function ServicoModal({ open, onClose, servico }: { open: boolean; onClose: () => void; servico?: Servico }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: servico ? {
      ...servico,
      valor_padrao: String(servico.valor_padrao)
    } : { ativo: true, valor_padrao: '0' },
  });

  const createMut = useCreateServico();
  const updateMut = useUpdateServico(servico?.id || '');

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      valor_padrao: parseFloat(data.valor_padrao) || 0,
      ativo: String(data.ativo) === 'true'
    };
    try {
      if (servico) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={servico ? 'Editar Serviço' : 'Novo Serviço'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome do Serviço*" {...register('nome', { required: 'Obrigatório' })} error={errors.nome?.message as string} />
        
        <Textarea label="Descrição" {...register('descricao')} rows={2} />

        <Input label="Valor Padrão (R$)" type="number" step="0.01" {...register('valor_padrao')} />

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

export default function ServicosPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editServico, setEditServico] = useState<Servico | undefined>();

  const { data: servicos, isLoading } = useServicos({ ...(search && { search }) });

  const openCreate = () => { setEditServico(undefined); setModalOpen(true); };
  const openEdit = (s: Servico) => { setEditServico(s); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Serviços</h1>
          <p className="text-muted-foreground text-sm">Gerencie os serviços prestados em manutenções e ordens de serviço.</p>
        </div>
        <Button onClick={openCreate}>Novo Serviço</Button>
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
        ) : servicos?.length === 0 ? (
          <EmptyState title="Nenhum serviço encontrado" description="Cadastre o primeiro serviço." action={<Button onClick={openCreate}>Cadastrar</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Nome</th><th>Descrição</th><th>Valor Padrão</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {servicos?.map(s => <ServicoRow key={s.id} servico={s} onEdit={() => openEdit(s)} />)}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <ServicoModal open={modalOpen} onClose={() => setModalOpen(false)} servico={editServico} />}
    </div>
  );
}
