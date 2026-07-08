'use client';

import { useState } from 'react';
import { useMateriais, useCreateMaterial, useUpdateMaterial, type Material } from '@/hooks/useApi';
import { Button, Modal, Input, Select, EmptyState, Skeleton } from '@/components/ui';
import { useForm } from 'react-hook-form';

function MaterialRow({ material, onEdit }: { material: Material; onEdit: () => void }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 font-medium text-sm">{material.nome}</td>
      <td className="px-4 py-3 text-sm capitalize">{material.finalidade}</td>
      <td className="px-4 py-3 text-sm">{material.unidade_medida}</td>
      <td className="px-4 py-3 text-sm">
        R$ {Number(material.custo_unitario).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm">
        R$ {Number(material.valor_venda).toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm">{material.quantidade_estoque}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${material.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {material.ativo ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
      </td>
    </tr>
  );
}

function MaterialModal({ open, onClose, material }: { open: boolean; onClose: () => void; material?: Material }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: material ? {
      ...material,
      custo_unitario: String(material.custo_unitario),
      valor_venda: String(material.valor_venda),
      quantidade_estoque: String(material.quantidade_estoque)
    } : { finalidade: 'consumo', unidade_medida: 'un', ativo: true, custo_unitario: '0', valor_venda: '0', quantidade_estoque: '0' },
  });

  const createMut = useCreateMaterial();
  const updateMut = useUpdateMaterial(material?.id || '');

  const onSubmit = async (data: any) => {
    const payload = { 
      ...data, 
      custo_unitario: parseFloat(data.custo_unitario) || 0,
      valor_venda: parseFloat(data.valor_venda) || 0,
      quantidade_estoque: parseFloat(data.quantidade_estoque) || 0,
      ativo: String(data.ativo) === 'true'
    };
    try {
      if (material) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={material ? 'Editar Material' : 'Novo Material'}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Nome*" {...register('nome', { required: 'Obrigatório' })} error={errors.nome?.message as string} />
        
        <Select label="Finalidade" options={[
          { value: 'consumo', label: 'Consumo (Interno/OS)' },
          { value: 'manutencao', label: 'Manutenção (Peças)' },
          { value: 'revenda', label: 'Revenda' },
          { value: 'multiplo', label: 'Múltiplo (Todos)' }
        ]} {...register('finalidade')} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Unidade Medida" {...register('unidade_medida')} placeholder="ex: un, kg, lt" />
          <Input label="Estoque Atual" type="number" step="0.01" {...register('quantidade_estoque')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Custo Unitário (R$)" type="number" step="0.01" {...register('custo_unitario')} />
          <Input label="Valor de Venda (R$)" type="number" step="0.01" {...register('valor_venda')} />
        </div>

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

export default function MateriaisPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | undefined>();

  const { data: materiais, isLoading } = useMateriais({ ...(search && { search }) });

  const openCreate = () => { setEditMaterial(undefined); setModalOpen(true); };
  const openEdit = (m: Material) => { setEditMaterial(m); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Materiais & Produtos</h1>
          <p className="text-muted-foreground text-sm">Gerencie itens de consumo, peças de manutenção e produtos de revenda.</p>
        </div>
        <Button onClick={openCreate}>Novo Material</Button>
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
        ) : materiais?.length === 0 ? (
          <EmptyState title="Nenhum material encontrado" description="Cadastre o primeiro item." action={<Button onClick={openCreate}>Cadastrar</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Nome</th><th>Finalidade</th><th>Un.</th><th>Custo (R$)</th><th>Venda (R$)</th><th>Estoque</th><th>Status</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {materiais?.map(m => <MaterialRow key={m.id} material={m} onEdit={() => openEdit(m)} />)}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <MaterialModal open={modalOpen} onClose={() => setModalOpen(false)} material={editMaterial} />}
    </div>
  );
}
