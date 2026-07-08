

import { useState } from 'react';
import { useContratos, useUpdateContratoStatus, usePagarParcela, useClientes, useMaquinas, useCreateContrato, useUpdateContrato, useDeleteContrato, useVendedores, type Contrato, type Parcela } from '@/hooks/useApi';
import { formatMoney, formatDate, getStatusColor, getStatusLabel } from '@/lib/utils';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

function PagarParcelaModal({ open, onClose, parcela, contratoId }: {
  open: boolean; onClose: () => void; parcela?: Parcela; contratoId: string;
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { valor_pago: parcela?.valor || 0, data_pagamento: new Date().toISOString().split('T')[0], forma_pagamento: 'pix', observacoes: '' },
  });
  const pagarMut = usePagarParcela();

  const onSubmit = async (data: { valor_pago: number; data_pagamento: string; forma_pagamento: string; observacoes: string }) => {
    if (!parcela) return;
    try {
      await pagarMut.mutateAsync({ contratoId, parcelaId: parcela.id, data: { valor_pago: Number(data.valor_pago), data_pagamento: data.data_pagamento, forma_pagamento: data.forma_pagamento, observacoes: data.observacoes } });
      reset();
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrar Pagamento" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-muted-foreground">Parcela {parcela?.numero_parcela} · Vence em {formatDate(parcela?.data_vencimento)}</p>
        <Input label="Valor Pago (R$)" type="number" step="0.01" {...register('valor_pago')} />
        <Input label="Data de Pagamento" type="date" {...register('data_pagamento')} />
        <Select label="Forma de Pagamento" options={[
          { value: 'pix', label: 'PIX' }, { value: 'boleto', label: 'Boleto' },
          { value: 'transferencia', label: 'Transferência' }, { value: 'dinheiro', label: 'Dinheiro' },
          { value: 'cheque', label: 'Cheque' },
        ]} {...register('forma_pagamento')} />
        <Textarea label="Observações" {...register('observacoes')} rows={2} />
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={pagarMut.isPending}>Confirmar Pagamento</Button>
        </div>
      </form>
    </Modal>
  );
}

function ContratoModal({ open, onClose, contrato }: { open: boolean; onClose: () => void; contrato?: Contrato }) {
  const { data: clientes } = useClientes();
  const { data: maquinasData } = useMaquinas({ status: 'disponivel' });
  const { data: vendedores } = useVendedores({ ativo: 'true' });
  
  const createMut = useCreateContrato();
  const updateMut = useUpdateContrato(contrato?.id || '');

  const [selectedMaquinas, setSelectedMaquinas] = useState<string[]>(
    contrato ? (contrato.contrato_itens?.map(ci => ci.maquinas?.id as string) || []) : []
  );

  const defaultValues = contrato ? {
    ...contrato,
    numero: contrato.numero || '',
    valor_mensal: String(contrato.valor_mensal),
    percentual_comissao: String(contrato.percentual_comissao || '0'),
    valor_comissao: String(contrato.valor_comissao || '0'),
    tipo_comissao: contrato.tipo_comissao || 'percentual',
    dia_vencimento: String(contrato.dia_vencimento),
    multa_rescisao_percentual: String(contrato.multa_rescisao_percentual),
    vendedor_id: contrato.vendedor_id || '',
  } : { 
    numero: '',
    percentual_comissao: '0',
    valor_comissao: '0',
    tipo_comissao: 'percentual',
    tipo_locacao: 'mensal',
    dia_vencimento: '10',
    data_primeiro_vencimento: '',
    multa_rescisao_percentual: '10',
    indice_reajuste: 'nenhum'
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<any>({ defaultValues });

  const valorMensal = watch('valor_mensal');
  const percentualComissao = watch('percentual_comissao');
  const tipoComissao = watch('tipo_comissao');
  const isPercentual = tipoComissao === 'percentual';
  const valorComissao = isPercentual
    ? (valorMensal && percentualComissao ? (parseFloat(String(valorMensal)) * parseFloat(String(percentualComissao)) / 100).toFixed(2) : '0.00')
    : (parseFloat(String(watch('valor_comissao') || 0)) || 0).toFixed(2);

  const onSubmit = async (data: any) => {
    if (selectedMaquinas.length === 0) return;
    const valorUnit = parseFloat(String(data.valor_mensal)) / selectedMaquinas.length;
    
    const payload = {
      ...data,
      numero: data.numero || undefined,
      valor_mensal: parseFloat(String(data.valor_mensal)) || 0,
      dia_vencimento: parseInt(String(data.dia_vencimento)) || 10,
      maquina_ids: selectedMaquinas,
      valores_unitarios: selectedMaquinas.map(() => valorUnit),
      manutencao_inclusa: !!data.manutencao_inclusa,
      seguro_incluso: !!data.seguro_incluso,
      multa_rescisao_percentual: parseFloat(String(data.multa_rescisao_percentual)) || 0,
      percentual_comissao: parseFloat(String(data.percentual_comissao)) || 0,
      tipo_comissao: data.tipo_comissao || 'percentual',
      valor_comissao: parseFloat(String(data.valor_comissao)) || 0,
      vendedor_id: data.vendedor_id || null,
      data_primeiro_vencimento: data.data_primeiro_vencimento || null
    };

    try {
      if (contrato) await updateMut.mutateAsync(payload);
      else await createMut.mutateAsync(payload);
      reset();
      setSelectedMaquinas([]);
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  const toggleMaquina = (id: string) => setSelectedMaquinas(prev =>
    prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
  );

  const maquinasAtuais = contrato?.contrato_itens?.map(ci => ci.maquinas) || [];
  const todasMaquinas = [...(maquinasData || []), ...maquinasAtuais].filter((v, i, a) => a.findIndex(t => (t && t.id === v?.id)) === i && v !== undefined);

  return (
    <Modal open={open} onClose={onClose} title={contrato ? "Editar Contrato" : "Novo Contrato de Locação"} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Número do Contrato (opcional, gerado se vazio)"
            placeholder="Ex: LOC-2026-001"
            {...register('numero')}
          />
          <Select
            label="Cliente*"
            options={(clientes || []).map(c => ({ value: c.id, label: c.razao_social }))}
            {...register('cliente_id', { required: true })}
            placeholder="Selecione o cliente..."
          />
          <Select
            label="Vendedor (opcional)"
            options={(vendedores || []).map(v => ({ value: v.id, label: v.nome }))}
            {...register('vendedor_id')}
            placeholder="Selecione o vendedor..."
          />
          <Select
            label="Tipo de Locação*"
            options={[{ value: 'mensal', label: 'Mensal' }, { value: 'semestral', label: 'Semestral' }, { value: 'anual', label: 'Anual' }]}
            {...register('tipo_locacao', { required: true })}
          />
          <Select
            label="Tipo da Comissão"
            options={[{ value: 'percentual', label: 'Percentual (%)' }, { value: 'fixo', label: 'Valor fixo (R$)' }]}
            {...register('tipo_comissao')}
          />
          {isPercentual ? (
            <Input label="Percentual Comissão (%)" type="number" step="0.01" min="0" max="100" {...register('percentual_comissao')} />
          ) : (
            <Input label="Valor Comissão (R$)" type="number" step="0.01" min="0" {...register('valor_comissao')} />
          )}
          <Input label="Data de Início*" type="date" {...register('data_inicio', { required: true })} />
          <Input label="Data de Fim" type="date" {...register('data_fim')} />
          <Input label="Valor Mensal (R$)*" type="number" step="0.01" {...register('valor_mensal', { required: true })} />
          <div>
            <label className="text-sm font-medium text-foreground">Valor Comissão (R$)</label>
            <p className="text-lg font-bold text-green-600 mt-1">R$ {valorComissao}</p>
          </div>
          <Input label="Dia Vencimento Base" type="number" min="1" max="28" {...register('dia_vencimento')} />
          <Input label="1º Vencimento (Fatura Inicial)" type="date" {...register('data_primeiro_vencimento')} />
          <Select
            label="Índice de Reajuste"
            options={[{ value: 'nenhum', label: 'Nenhum' }, { value: 'ipca', label: 'IPCA' }, { value: 'igpm', label: 'IGP-M' }, { value: 'fixo', label: 'Fixo' }]}
            {...register('indice_reajuste')}
          />
          <Input label="Multa Rescisão (%)" type="number" step="0.01" {...register('multa_rescisao_percentual')} />
        </div>

        {/* Machine selection */}
        <div>
          <p className="text-sm font-medium mb-2">Máquinas Disponíveis para Locar*</p>
          {todasMaquinas.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">Nenhuma máquina disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-lg p-3">
              {todasMaquinas.map(m => {
                if (!m) return null;
                return (
                  <label key={m.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedMaquinas.includes(m.id) ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                    <input type="checkbox" checked={selectedMaquinas.includes(m.id)} onChange={() => toggleMaquina(m.id)} className="accent-primary" />
                    <span className="text-sm">{m.nome} — {m.modelo}</span>
                  </label>
                );
              })}
            </div>
          )}
          {selectedMaquinas.length > 0 && (
            <p className="text-xs text-primary mt-1">{selectedMaquinas.length} máquina(s) selecionada(s)</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Textarea label="Cláusulas Adicionais" {...register('clausulas_adicionais')} rows={2} />
          <Textarea label="Observações" {...register('observacoes')} rows={2} />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending || updateMut.isPending} disabled={selectedMaquinas.length === 0}>
            {contrato ? 'Salvar Alterações' : 'Criar Contrato'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ContratosPage() {
  const [statusFilter, setStatusFilter] = useState('ativo');
  const [modalOpen, setModalOpen] = useState(false);
  const [editContrato, setEditContrato] = useState<Contrato | undefined>();
  const [encerrarId, setEncerrarId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pagarParcela, setPagarParcela] = useState<{ parcela: Parcela; contratoId: string } | null>(null);

  const { data: contratos, isLoading } = useContratos({ ...(statusFilter && { status: statusFilter }) });
  const updateStatusMut = useUpdateContratoStatus();
  const deleteMut = useDeleteContrato();

  const openCreate = () => { setEditContrato(undefined); setModalOpen(true); };
  const openEdit = (c: Contrato) => { setEditContrato(c); setModalOpen(true); };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteMut.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2">
          {[{ value: 'ativo', label: 'Ativos' }, { value: 'suspenso', label: 'Suspensos' }, { value: 'encerrado', label: 'Encerrados' }, { value: '', label: 'Todos' }].map(opt => (
            <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${statusFilter === opt.value ? 'bg-primary text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button onClick={openCreate}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Contrato
        </Button>
      </div>

      {/* Contracts list */}
      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : contratos?.length === 0 ? (
        <EmptyState title="Nenhum contrato encontrado" description="Crie o primeiro contrato de locação." action={<Button onClick={openCreate}>Novo Contrato</Button>} />
      ) : (
        <div className="space-y-3">
          {contratos?.map(contrato => (
            <div key={contrato.id} className="bg-white rounded-2xl border border-border shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-primary text-sm font-mono">{contrato.numero}</span>
                    <span className={getStatusColor(contrato.status)}>{getStatusLabel(contrato.status)}</span>
                    <span className="badge-blue capitalize">{contrato.tipo_locacao}</span>
                  </div>
                  <p className="font-semibold text-foreground">{contrato.clientes?.razao_social}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(contrato.data_inicio)} → {contrato.data_fim ? formatDate(contrato.data_fim) : 'Indeterminado'} · Vence dia {contrato.dia_vencimento}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{formatMoney(contrato.valor_mensal)}</p>
                  <p className="text-xs text-muted-foreground">por mês</p>
                  {contrato.vendedores && (
                    <p className="text-xs text-blue-600 mt-1">Comissão: {formatMoney(contrato.valor_comissao)}</p>
                  )}
                </div>
              </div>

              {/* Machines */}
              {contrato.contrato_itens && contrato.contrato_itens.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {contrato.contrato_itens.map(item => (
                    <span key={item.id} className="badge-blue text-xs">
                      {item.maquinas?.nome} — {formatMoney(item.valor_unitario)}/mês
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border/50 justify-between items-center">
                <div className="flex gap-2">
                  <Link to={`/contratos/${contrato.id}`}>
                    <Button variant="outline" size="sm">Ver Parcelas</Button>
                  </Link>
                  <Button variant="outline" size="sm" onClick={() => openEdit(contrato)}>Editar</Button>
                  {contrato.status === 'ativo' && (
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => setEncerrarId(contrato.id)}>
                      Encerrar
                    </Button>
                  )}
                  {contrato.status === 'suspenso' && (
                    <Button size="sm" onClick={() => updateStatusMut.mutate({ id: contrato.id, status: 'ativo' })}>Reativar</Button>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeleteId(contrato.id)}>Excluir</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <ContratoModal open={modalOpen} onClose={() => setModalOpen(false)} contrato={editContrato} />}

      <ConfirmDialog
        open={!!encerrarId}
        onClose={() => setEncerrarId(null)}
        onConfirm={async () => {
          if (encerrarId) {
            await updateStatusMut.mutateAsync({ id: encerrarId, status: 'encerrado' });
            setEncerrarId(null);
          }
        }}
        loading={updateStatusMut.isPending}
        title="Encerrar contrato?"
        description="As parcelas futuras pendentes serão canceladas e as máquinas liberadas."
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        loading={deleteMut.isPending}
        title="Excluir Contrato"
        description="Tem certeza que deseja excluir este contrato? Esta ação removerá o contrato, as parcelas associadas e liberará as máquinas. Isso não pode ser desfeito."
      />

      {pagarParcela && (
        <PagarParcelaModal
          open={!!pagarParcela}
          onClose={() => setPagarParcela(null)}
          parcela={pagarParcela.parcela}
          contratoId={pagarParcela.contratoId}
        />
      )}
    </div>
  );
}
