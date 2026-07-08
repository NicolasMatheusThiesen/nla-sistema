'use client';

import { useState } from 'react';
import { useMaquinas, useDeleteMaquina, type Maquina } from '@/hooks/useApi';
import { formatMoney, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { useCreateMaquina, useUpdateMaquina } from '@/hooks/useApi';
import Link from 'next/link';
import { Forklift, Truck, Settings } from 'lucide-react';
import { useTiposEquipamento } from '@/hooks/useApi';

const subtipoOptions = [
  { value: 'eletrica', label: 'Elétrica' },
  { value: 'glp', label: 'GLP' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'manual', label: 'Manual' },
  { value: 'outro', label: 'Outro' },
];

function MaquinaCard({ maq, onEdit, onDelete }: { maq: Maquina; onEdit: () => void; onDelete: () => void }) {
  const statusClass = getStatusColor(maq.status);
  
  const TipoIcon = maq.tipo === 'empilhadeira' ? Forklift : maq.tipo === 'paleteira' ? Truck : Settings;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Header */}
      <div className="h-3 bg-gradient-to-r from-primary to-blue-400" />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <TipoIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm leading-tight">{maq.nome}</h3>
              <p className="text-xs text-muted-foreground">{maq.modelo} {maq.marca && `· ${maq.marca}`}</p>
            </div>
          </div>
          <span className={statusClass}>{getStatusLabel(maq.status)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Capacidade</p>
            <p className="text-sm font-semibold">{maq.capacidade_kg ? `${maq.capacidade_kg}kg` : '-'}</p>
          </div>
          <div className="bg-muted/40 rounded-lg p-2 text-center">
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="text-sm font-semibold">{formatMoney(maq.valor_mercado)}</p>
          </div>
        </div>

        {maq.numero_serie && (
          <p className="text-xs text-muted-foreground mb-3">Nº Série: <span className="font-mono">{maq.numero_serie}</span></p>
        )}

        <div className="flex gap-2 pt-3 border-t border-border">
          <Link href={`/maquinas/${maq.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full">Ver Detalhes</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface MaquinaForm {
  nome: string; modelo: string; marca: string; numero_serie: string;
  ano_fabricacao: string; tipo: string; subtipo: string;
  capacidade_kg: string; altura_max_elevacao: string;
  valor_aquisicao: string; valor_mercado: string; custo_mensal_estimado: string;
  data_aquisicao: string; observacoes: string;
}

function MaquinaModal({ open, onClose, maquina }: { open: boolean; onClose: () => void; maquina?: Maquina }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
    defaultValues: maquina ? {
      nome: maquina.nome, modelo: maquina.modelo || '', marca: maquina.marca || '',
      numero_serie: maquina.numero_serie || '', ano_fabricacao: String(maquina.ano_fabricacao || ''),
      tipo: maquina.tipo, subtipo: maquina.subtipo || '',
      capacidade_kg: String(maquina.capacidade_kg || ''), altura_max_elevacao: String(maquina.altura_max_elevacao || ''),
      valor_aquisicao: String(maquina.valor_aquisicao || ''), valor_mercado: String(maquina.valor_mercado || ''),
      custo_mensal_estimado: String(maquina.custo_mensal_estimado || ''),
      data_aquisicao: maquina.data_aquisicao || '', observacoes: maquina.observacoes || '',
    } : { tipo: 'empilhadeira', subtipo: 'eletrica' },
  });

  const createMut = useCreateMaquina();
  const updateMut = useUpdateMaquina(maquina?.id || '');

  const { data: tiposData } = useTiposEquipamento();
  const tiposOp = (tiposData || []).map(t => ({ value: t.nome, label: t.nome }));

  const nullableText = (value: unknown) => {
    if (typeof value !== 'string') return value ?? null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };

  const optionalNumber = (value: unknown) => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  
  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      nome: String(data.nome || '').trim(),
      modelo: nullableText(data.modelo),
      marca: nullableText(data.marca),
      numero_serie: nullableText(data.numero_serie),
      ano_fabricacao: optionalNumber(data.ano_fabricacao),
      tipo: String(data.tipo || '').trim(),
      subtipo: nullableText(data.subtipo),
      capacidade_kg: optionalNumber(data.capacidade_kg),
      altura_max_elevacao: optionalNumber(data.altura_max_elevacao),
      valor_aquisicao: optionalNumber(data.valor_aquisicao) ?? 0,
      valor_mercado: optionalNumber(data.valor_mercado) ?? 0,
      custo_mensal_estimado: optionalNumber(data.custo_mensal_estimado) ?? 0,
      data_aquisicao: nullableText(data.data_aquisicao),
      observacoes: nullableText(data.observacoes),
    };

    try {
      if (maquina) {
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

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={maquina ? 'Editar Máquina' : 'Nova Máquina'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nome*" {...register('nome', { required: 'Obrigatório' })} error={errors.nome?.message as string} placeholder="Ex: Empilhadeira EP-01" />
          <Input label="Modelo" {...register('modelo')} placeholder="Ex: 3FBP16" />
          <Input label="Marca" {...register('marca')} placeholder="Ex: Toyota" />
          <Input label="Número de Série" {...register('numero_serie')} placeholder="Ex: 9BWZZZ3..." />
          <Input label="Ano de Fabricação" type="number" {...register('ano_fabricacao')} placeholder="Ex: 2020" />
          <Select label="Tipo*" options={tiposOp.length > 0 ? tiposOp : [{ value: 'outro', label: 'Outro' }]} {...register('tipo', { required: 'Obrigatório' })} />
          <Select label="Subtipo" options={subtipoOptions} {...register('subtipo')} placeholder="Selecione..." />
          <Input label="Capacidade (kg)" type="number" step="0.01" {...register('capacidade_kg')} placeholder="Ex: 2000" />
          <Input label="Altura Máx. Elevação (m)" type="number" step="0.01" {...register('altura_max_elevacao')} placeholder="Ex: 4.5" />
          <Input label="Data de Aquisição" type="date" {...register('data_aquisicao')} />
          <Input label="Valor de Aquisição (R$)" type="number" step="0.01" {...register('valor_aquisicao')} placeholder="0,00" />
          <Input label="Valor de Mercado (R$)" type="number" step="0.01" {...register('valor_mercado')} placeholder="0,00" />
          <Input label="Custo Mensal Estimado (R$)" type="number" step="0.01" {...register('custo_mensal_estimado')} placeholder="0,00" />
        </div>
        <Textarea label="Observações" {...register('observacoes')} rows={3} placeholder="Informações adicionais..." />
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>{maquina ? 'Salvar Alterações' : 'Cadastrar Máquina'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function MaquinasPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editMaquina, setEditMaquina] = useState<Maquina | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: maquinas, isLoading } = useMaquinas({
    ...(search && { search }),
    ...(statusFilter && { status: statusFilter }),
    ...(tipoFilter && { tipo: tipoFilter }),
  });
  const deleteMut = useDeleteMaquina();

  const openCreate = () => { setEditMaquina(undefined); setModalOpen(true); };
  const openEdit = (m: Maquina) => { setEditMaquina(m); setModalOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar máquinas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          {[{ value: '', label: 'Todos os status' }, { value: 'disponivel', label: 'Disponível' }, { value: 'locada', label: 'Locada' }, { value: 'manutencao', label: 'Manutenção' }, { value: 'vendida', label: 'Vendida' }].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === opt.value ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Máquina
        </Button>
      </div>

      {/* Summary cards */}
      {maquinas && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total', value: maquinas.length, color: 'text-foreground' },
            { label: 'Disponíveis', value: maquinas.filter(m => m.status === 'disponivel').length, color: 'text-green-600' },
            { label: 'Locadas', value: maquinas.filter(m => m.status === 'locada').length, color: 'text-blue-600' },
            { label: 'Manutenção', value: maquinas.filter(m => m.status === 'manutencao').length, color: 'text-amber-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-border p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : maquinas?.length === 0 ? (
        <EmptyState
          title="Nenhuma máquina encontrada"
          description="Cadastre a primeira máquina para começar a gerenciar sua frota."
          action={<Button onClick={openCreate}>Cadastrar Máquina</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {maquinas?.map(m => (
            <MaquinaCard key={m.id} maq={m} onEdit={() => openEdit(m)} onDelete={() => setDeleteId(m.id)} />
          ))}
        </div>
      )}

      {modalOpen && <MaquinaModal open={modalOpen} onClose={() => setModalOpen(false)} maquina={editMaquina} />}
      
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => { if (deleteId) { await deleteMut.mutateAsync(deleteId); setDeleteId(null); } }}
        loading={deleteMut.isPending}
        title="Remover máquina?"
        description="A máquina será desativada. O histórico será mantido."
      />
    </div>
  );
}
