'use client';

import { useState } from 'react';
import { useClientes, useCreateCliente, useUpdateCliente, type Cliente } from '@/hooks/useApi';
import { formatCPFCNPJ, formatPhone, getStatusColor, getStatusLabel, formatMoney } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm } from 'react-hook-form';
import Link from 'next/link';

const estadoOptions = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(e => ({ value: e, label: e }));

function ClienteRow({ cliente, onEdit }: { cliente: Cliente; onEdit: () => void }) {
  return (
    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm text-foreground">{cliente.razao_social}</p>
          {cliente.nome_fantasia && <p className="text-xs text-muted-foreground">{cliente.nome_fantasia}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-mono">{formatCPFCNPJ(cliente.cpf_cnpj)}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{formatPhone(cliente.telefone || '')}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{cliente.cidade && `${cliente.cidade}/${cliente.estado}`}</td>
      <td className="px-4 py-3">
        <span className={getStatusColor(cliente.status_credito)}>{getStatusLabel(cliente.status_credito)}</span>
      </td>
      <td className="px-4 py-3 text-sm font-medium">{formatMoney(cliente.limite_credito)}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link href={`/clientes/${cliente.id}`}>
            <Button variant="ghost" size="sm">Ver</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onEdit}>Editar</Button>
        </div>
      </td>
    </tr>
  );
}

type ClienteFormData = {
  tipo_pessoa: 'PF' | 'PJ'; cpf_cnpj: string; razao_social: string; nome_fantasia: string;
  email: string; telefone: string; telefone2: string; contato_financeiro: string;
  telefone_financeiro: string; cep: string; endereco: string; numero: string;
  complemento: string; bairro: string; cidade: string; estado: string;
  limite_credito: string; status_credito: 'bom' | 'regular' | 'bloqueado'; observacoes: string;
};

function ClienteModal({ open, onClose, cliente }: { open: boolean; onClose: () => void; cliente?: Cliente }) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<any>({
    defaultValues: cliente ? {
      ...cliente, limite_credito: String(cliente.limite_credito || '0'),
    } : { tipo_pessoa: 'PJ', status_credito: 'bom', limite_credito: '0' },
  });

  const createMut = useCreateCliente();
  const updateMut = useUpdateCliente(cliente?.id || '');
  const tipoPessoa = watch('tipo_pessoa');

  // Busca de CEP via ViaCEP
  const buscarCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    const data = await res.json();
    if (!data.erro) {
      setValue('endereco', data.logradouro);
      setValue('bairro', data.bairro);
      setValue('cidade', data.localidade);
      setValue('estado', data.uf);
    }
  };

  const onSubmit = async (data: any) => {
    const payload = { ...data, limite_credito: parseFloat(data.limite_credito) || 0 };
    try {
      if (cliente) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const isLoading = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} onClose={onClose} title={cliente ? 'Editar Cliente' : 'Novo Cliente'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Tipo */}
        <div className="flex gap-3">
          {(['PJ', 'PF'] as const).map(t => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" value={t} {...register('tipo_pessoa')} className="accent-primary" />
              <span className="text-sm font-medium">{t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={tipoPessoa === 'PJ' ? 'CNPJ*' : 'CPF*'}
            {...register('cpf_cnpj', { required: 'Obrigatório' })}
            error={errors.cpf_cnpj?.message as string}
            placeholder={tipoPessoa === 'PJ' ? '00.000.000/0001-00' : '000.000.000-00'}
          />
          <Input
            label={tipoPessoa === 'PJ' ? 'Razão Social*' : 'Nome Completo*'}
            {...register('razao_social', { required: 'Obrigatório' })}
            error={errors.razao_social?.message as string}
          />
          {tipoPessoa === 'PJ' && <Input label="Nome Fantasia" {...register('nome_fantasia')} />}
          {tipoPessoa === 'PJ' && <Input label="Inscrição Estadual" {...register('inscricao_estadual')} />}
          <Input label="E-mail" type="email" {...register('email')} />
          <Input label="Telefone" {...register('telefone')} placeholder="(11) 99999-0000" />
          <Input label="Telefone 2" {...register('telefone2')} placeholder="(11) 99999-0000" />
          <Input label="Contato Financeiro" {...register('contato_financeiro')} />
          <Input label="Telefone Financeiro" {...register('telefone_financeiro')} />
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-semibold mb-3">Endereço</p>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="CEP"
              {...register('cep')}
              onBlur={e => buscarCep(e.target.value)}
              placeholder="00000-000"
            />
            <div className="col-span-2">
              <Input label="Endereço" {...register('endereco')} />
            </div>
            <Input label="Número" {...register('numero')} />
            <Input label="Complemento" {...register('complemento')} />
            <Input label="Bairro" {...register('bairro')} />
            <Input label="Cidade" {...register('cidade')} />
            <Select label="Estado" options={estadoOptions} {...register('estado')} placeholder="UF" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <Input label="Limite de Crédito (R$)" type="number" step="0.01" {...register('limite_credito')} />
          <Select label="Score de Crédito" options={[
            { value: 'bom', label: 'Bom' },
            { value: 'regular', label: 'Regular' },
            { value: 'bloqueado', label: 'Bloqueado' },
          ]} {...register('status_credito')} />
        </div>

        <Textarea label="Observações" {...register('observacoes')} rows={2} />

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={isLoading}>{cliente ? 'Salvar' : 'Cadastrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ClientesPage() {
  const [search, setSearch] = useState('');
  const [creditoFilter, setCreditoFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<Cliente | undefined>();

  const { data: clientes, isLoading } = useClientes({
    ...(search && { search }),
    ...(creditoFilter && { status_credito: creditoFilter }),
  });

  const openCreate = () => { setEditCliente(undefined); setModalOpen(true); };
  const openEdit = (c: Cliente) => { setEditCliente(c); setModalOpen(true); };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Buscar por nome, CNPJ/CPF..." value={search} onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={creditoFilter} onChange={e => setCreditoFilter(e.target.value)} className="h-9 rounded-lg border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-36">
          <option value="">Todos os scores</option>
          <option value="bom">Bom</option>
          <option value="regular">Regular</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Cliente
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : clientes?.length === 0 ? (
          <EmptyState title="Nenhum cliente encontrado" description="Cadastre o primeiro cliente." action={<Button onClick={openCreate}>Cadastrar Cliente</Button>} />
        ) : (
          <table className="w-full data-table">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                <th>Cliente</th><th>CPF/CNPJ</th><th>Telefone</th><th>Cidade/Estado</th>
                <th>Score</th><th>Limite</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes?.map(c => <ClienteRow key={c.id} cliente={c} onEdit={() => openEdit(c)} />)}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && <ClienteModal open={modalOpen} onClose={() => setModalOpen(false)} cliente={editCliente} />}
    </div>
  );
}
