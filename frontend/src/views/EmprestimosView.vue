<script setup lang="ts">
import { computed, ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import {
  useClientes,
  useContasBancarias,
  useCreateEmprestimo,
  useDeleteEmprestimo,
  useEmprestimos,
  useFornecedores,
  usePagarParcelaEmprestimo,
  type Emprestimo,
} from '@/composables/useApi';

const isModalOpen = ref(false);
const statusFilter = ref('');
const expandedId = ref<string | null>(null);

const { data: emprestimos, isLoading } = useEmprestimos();
const { data: fornecedores } = useFornecedores();
const { data: clientes } = useClientes();
const { data: contas } = useContasBancarias();
const createEmprestimo = useCreateEmprestimo();
const deleteEmprestimo = useDeleteEmprestimo();
const pagarParcela = usePagarParcelaEmprestimo();

const form = ref({
  descricao: '',
  tipo: 'emprestimo_tomado' as Emprestimo['tipo'],
  instituicao_financeira: '',
  fornecedor_id: '',
  cliente_id: '',
  conta_bancaria_id: '',
  valor_total: 0,
  taxa_juros: 0,
  tipo_juros: 'sem_juros' as Emprestimo['tipo_juros'],
  numero_parcelas: 1,
  valor_parcela: undefined as number | undefined,
  data_contratacao: new Date().toISOString().slice(0, 10),
  data_primeiro_vencimento: new Date().toISOString().slice(0, 10),
  observacoes: '',
});

const fornecedorOptions = computed(() => [
  { value: '', label: 'Nenhum' },
  ...(fornecedores.value || []).map(item => ({ value: item.id, label: item.razao_social })),
]);
const clienteOptions = computed(() => [
  { value: '', label: 'Nenhum' },
  ...(clientes.value || []).map(item => ({ value: item.id, label: item.razao_social })),
]);
const contaOptions = computed(() => [
  { value: '', label: 'Nenhuma' },
  ...(contas.value || []).map(item => ({ value: item.id, label: `${item.nome}${item.banco ? ` - ${item.banco}` : ''}` })),
]);

const filteredEmprestimos = computed(() => (emprestimos.value || []).filter(item =>
  !statusFilter.value || item.status === statusFilter.value
));

const resetForm = () => {
  form.value = {
    descricao: '',
    tipo: 'emprestimo_tomado',
    instituicao_financeira: '',
    fornecedor_id: '',
    cliente_id: '',
    conta_bancaria_id: '',
    valor_total: 0,
    taxa_juros: 0,
    tipo_juros: 'sem_juros',
    numero_parcelas: 1,
    valor_parcela: undefined,
    data_contratacao: new Date().toISOString().slice(0, 10),
    data_primeiro_vencimento: new Date().toISOString().slice(0, 10),
    observacoes: '',
  };
};

const submit = () => {
  if (!form.value.descricao.trim() || form.value.valor_total <= 0 || form.value.numero_parcelas < 1) {
    window.alert('Informe a descrição, o valor total e pelo menos uma parcela.');
    return;
  }

  const payload = { ...form.value };
  if (!payload.fornecedor_id) delete (payload as Partial<typeof payload>).fornecedor_id;
  if (!payload.cliente_id) delete (payload as Partial<typeof payload>).cliente_id;
  if (!payload.conta_bancaria_id) delete (payload as Partial<typeof payload>).conta_bancaria_id;
  if (!payload.valor_parcela) delete (payload as Partial<typeof payload>).valor_parcela;

  createEmprestimo.mutate(payload, {
    onSuccess: () => {
      isModalOpen.value = false;
      resetForm();
    },
    onError: (error: any) => window.alert(`Erro ao salvar: ${error?.response?.data?.error || error.message}`),
  });
};

const liquidarParcela = (emprestimo: Emprestimo, parcelaId: string) => {
  const confirma = window.confirm('Registrar esta parcela como paga/recebida pelo valor integral?');
  if (!confirma) return;
  pagarParcela.mutate({
    emprestimoId: emprestimo.id,
    parcelaId,
    data: { data_pagamento: new Date().toISOString().slice(0, 10) },
  }, {
    onError: (error: any) => window.alert(`Erro ao registrar parcela: ${error?.response?.data?.error || error.message}`),
  });
};

const remover = (item: Emprestimo) => {
  if (window.confirm(`Excluir "${item.descricao}" e suas parcelas financeiras?`)) {
    deleteEmprestimo.mutate(item.id, {
      onError: (error: any) => window.alert(`Erro ao excluir: ${error?.response?.data?.error || error.message}`),
    });
  }
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const date = (value?: string) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value.slice(0, 10)}T12:00:00`)) : '-';
const kindLabel = (item: Emprestimo) => ({
  emprestimo_tomado: 'Empréstimo tomado',
  emprestimo_concedido: 'Empréstimo concedido',
  financiamento: 'Financiamento',
}[item.tipo]);
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div>
        <h2 class="title">Empréstimos e financiamentos</h2>
        <p class="subtitle">Acompanhe valores, vencimentos e parcelas no financeiro.</p>
      </div>
      <Button variant="primary" @click="isModalOpen = true">+ Novo registro</Button>
    </header>

    <div class="toolbar glass">
      <label for="status-filter">Status</label>
      <select id="status-filter" v-model="statusFilter" class="select-filter">
        <option value="">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="quitado">Quitados</option>
        <option value="cancelado">Cancelados</option>
      </select>
    </div>

    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr><th>Registro</th><th>Instituição / Parte</th><th>Contratação</th><th>Parcelas</th><th>Saldo pendente</th><th>Status</th><th class="text-right">Ações</th></tr>
        </thead>
        <tbody>
          <tr v-if="isLoading"><td colspan="7" class="empty-state">Carregando registros...</td></tr>
          <tr v-else-if="filteredEmprestimos.length === 0"><td colspan="7" class="empty-state">Nenhum empréstimo ou financiamento encontrado.</td></tr>
          <template v-for="item in filteredEmprestimos" :key="item.id">
            <tr>
              <td><strong>{{ item.descricao }}</strong><div class="text-sm text-secondary">{{ kindLabel(item) }} · {{ money(item.valor_total) }}</div></td>
              <td>{{ item.instituicao_financeira || item.fornecedores?.razao_social || item.clientes?.razao_social || '-' }}</td>
              <td>{{ date(item.data_contratacao) }}</td>
              <td>{{ item.resumo?.parcelas_pagas || 0 }} / {{ item.numero_parcelas }} pagas<div class="progress"><span :style="{ width: `${item.resumo?.percentual_pago || 0}%` }" /></div></td>
              <td>{{ money(item.resumo?.total_pendente || 0) }}</td>
              <td><span class="badge" :class="item.status === 'quitado' ? 'badge-success' : 'badge-warning'">{{ item.status }}</span></td>
              <td class="actions-cell">
                <Button variant="ghost" size="sm" @click="expandedId = expandedId === item.id ? null : item.id">{{ expandedId === item.id ? 'Ocultar parcelas' : 'Parcelas' }}</Button>
                <Button variant="ghost" size="sm" class="btn-delete" :disabled="deleteEmprestimo.isPending.value" @click="remover(item)">Excluir</Button>
              </td>
            </tr>
            <tr v-if="expandedId === item.id" class="installments-row">
              <td colspan="7">
                <table class="installments-table">
                  <thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th><th></th></tr></thead>
                  <tbody>
                    <tr v-for="parcela in item.emprestimo_parcelas || []" :key="parcela.id">
                      <td>{{ parcela.numero_parcela }} / {{ item.numero_parcelas }}</td>
                      <td>{{ date(parcela.data_vencimento) }}</td>
                      <td>{{ money(parcela.valor_parcela) }}</td>
                      <td>{{ parcela.status }}</td>
                      <td>{{ date(parcela.data_pagamento) }}</td>
                      <td class="text-right"><Button v-if="parcela.status === 'pendente' || parcela.status === 'vencido'" variant="outline" size="sm" :disabled="pagarParcela.isPending.value" @click="liquidarParcela(item, parcela.id)">{{ item.tipo === 'emprestimo_concedido' ? 'Registrar recebimento' : 'Registrar pagamento' }}</Button></td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <Modal :open="isModalOpen" title="Novo empréstimo ou financiamento" size="xl" @close="isModalOpen = false">
      <div class="form-grid">
        <div class="col-span-2"><Input v-model="form.descricao" label="Descrição" placeholder="Ex.: Financiamento da empilhadeira" /></div>
        <Select v-model="form.tipo" label="Tipo" :options="[{ value: 'emprestimo_tomado', label: 'Empréstimo tomado' }, { value: 'emprestimo_concedido', label: 'Empréstimo concedido' }, { value: 'financiamento', label: 'Financiamento' }]" />
        <Input v-model="form.instituicao_financeira" label="Instituição financeira" />
        <Select v-model="form.fornecedor_id" label="Fornecedor relacionado" :options="fornecedorOptions" />
        <Select v-model="form.cliente_id" label="Cliente relacionado" :options="clienteOptions" />
        <Select v-model="form.conta_bancaria_id" label="Conta bancária" :options="contaOptions" />
        <Input v-model="form.valor_total" label="Valor total (R$)" type="number" min="0.01" step="0.01" />
        <Input v-model="form.numero_parcelas" label="Número de parcelas" type="number" min="1" max="600" />
        <Select v-model="form.tipo_juros" label="Regra de juros" :options="[{ value: 'sem_juros', label: 'Sem juros' }, { value: 'simples', label: 'Juros simples mensal' }, { value: 'composto', label: 'Juros compostos (Price)' }, { value: 'fixo', label: 'Valor de parcela fixo' }]" />
        <Input v-model="form.taxa_juros" label="Taxa mensal (%)" type="number" min="0" step="0.01" />
        <Input v-model="form.valor_parcela" label="Valor da parcela (opcional)" type="number" min="0.01" step="0.01" />
        <Input v-model="form.data_contratacao" label="Data de contratação" type="date" />
        <Input v-model="form.data_primeiro_vencimento" label="Primeiro vencimento" type="date" />
        <div class="col-span-2"><Input v-model="form.observacoes" label="Observações" /></div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" :disabled="createEmprestimo.isPending.value" @click="submit">{{ createEmprestimo.isPending.value ? 'Salvando...' : 'Salvar e gerar parcelas' }}</Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.page-container { display: flex; flex-direction: column; gap: 1.25rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 1rem; }
.title { font-size: 1.75rem; margin-bottom: .25rem; }
.subtitle, .text-secondary { color: var(--c-text-secondary); }
.subtitle { font-size: .875rem; }
.toolbar { display: flex; align-items: center; gap: .75rem; padding: .75rem 1rem; border-radius: var(--radius-lg); }
.select-filter { padding: .5rem .75rem; border: 1px solid var(--c-border); border-radius: var(--radius-md); background: var(--c-surface); color: var(--c-text-primary); }
.table-container { border-radius: var(--radius-lg); overflow-x: auto; }
.data-table, .installments-table { width: 100%; border-collapse: collapse; text-align: left; }
.data-table th, .data-table td, .installments-table th, .installments-table td { padding: .85rem 1rem; border-bottom: 1px solid var(--c-border); font-size: .875rem; }
.data-table th, .installments-table th { color: var(--c-text-secondary); font-weight: 600; white-space: nowrap; }
.text-sm { font-size: .75rem; margin-top: .25rem; }
.text-right { text-align: right; }
.actions-cell { display: flex; justify-content: flex-end; align-items: center; gap: .5rem; white-space: nowrap; }
.badge { display: inline-flex; padding: .25rem .5rem; border-radius: var(--radius-full); font-size: .75rem; text-transform: capitalize; }
.badge-success { background: rgba(34,197,94,.1); color: #16a34a; }
.badge-warning { background: rgba(245,158,11,.12); color: #b45309; }
.progress { height: 4px; width: 100%; margin-top: .35rem; background: var(--c-border); }
.progress span { display: block; height: 100%; background: #15803d; }
.installments-row > td { padding: 0 1rem 1rem; background: var(--c-bg); }
.installments-table { margin-top: .5rem; }
.empty-state { text-align: center; padding: 2.5rem; color: var(--c-text-secondary); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.col-span-2 { grid-column: span 2; }
.modal-actions { display: flex; justify-content: flex-end; gap: .75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--c-border); }
.btn-delete { color: #dc2626; }
@media (max-width: 700px) { .page-header { align-items: flex-start; flex-direction: column; } .form-grid { grid-template-columns: 1fr; } .col-span-2 { grid-column: auto; } }
</style>