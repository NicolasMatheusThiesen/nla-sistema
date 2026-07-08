<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useLancamentos, useCreateLancamento, useUpdateLancamento, useClientes, useFornecedores, useContasBancarias, type Lancamento } from '@/composables/useApi';

const tipoFilter = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: lancamentosData, isLoading } = useLancamentos();
const { data: clientes } = useClientes();
const { data: fornecedores } = useFornecedores();
const { data: contasBancarias } = useContasBancarias();
const createLancamento = useCreateLancamento();
const updateLancamento = useUpdateLancamento();

const clienteOptions = computed(() => {
  const options = (clientes.value || []).map(c => ({ value: c.id, label: c.razao_social }));
  options.unshift({ value: '', label: 'Nenhum' });
  return options;
});

const fornecedorOptions = computed(() => {
  const options = (fornecedores.value || []).map(f => ({ value: f.id, label: f.razao_social }));
  options.unshift({ value: '', label: 'Nenhum' });
  return options;
});

const contaOptions = computed(() => {
  const options = (contasBancarias.value || []).map(c => ({ value: c.id, label: `${c.nome} ${c.banco ? '- '+c.banco : ''}` }));
  options.unshift({ value: '', label: 'Nenhuma' });
  return options;
});

const form = ref<Partial<Lancamento>>({
  tipo: 'receita',
  status: 'pendente',
  descricao: '',
  valor: 0,
  data_competencia: new Date().toISOString().split('T')[0],
  data_vencimento: new Date().toISOString().split('T')[0],
  cliente_id: '',
  fornecedor_id: '',
  conta_bancaria_id: '',
  data_pagamento: ''
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    tipo: 'receita',
    status: 'pendente',
    descricao: '',
    valor: 0,
    data_competencia: new Date().toISOString().split('T')[0],
    data_vencimento: new Date().toISOString().split('T')[0],
    cliente_id: '',
    fornecedor_id: '',
    conta_bancaria_id: '',
    data_pagamento: ''
  };
};

const openNovoLancamento = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Lancamento) => {
  editingId.value = item.id;
  form.value = {
    ...item,
    data_competencia: item.data_competencia?.split('T')[0],
    data_vencimento: item.data_vencimento?.split('T')[0],
    data_pagamento: (item as any).data_pagamento?.split('T')[0] || ''
  };
  isModalOpen.value = true;
};

const submitLancamento = async () => {
  if (!form.value.descricao || !form.value.valor) {
    alert("Preencha a descrição e o valor.");
    return;
  }
  
  const payload = { ...form.value };
  if (!payload.cliente_id) delete payload.cliente_id;
  if (!payload.fornecedor_id) delete payload.fornecedor_id;
  if (!payload.conta_bancaria_id) delete payload.conta_bancaria_id;
  if (!payload.data_pagamento) delete payload.data_pagamento;

  if (editingId.value) {
    updateLancamento.mutate({ id: editingId.value, data: payload }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar lançamento: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createLancamento.mutate(payload, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar lançamento: " + (err?.response?.data?.error || err.message))
    });
  }
};

const filteredLancamentos = computed(() => {
  if (!lancamentosData.value?.data) return [];
  const list = lancamentosData.value.data;
  if (!tipoFilter.value) return list;
  return list.filter(l => l.tipo === tipoFilter.value);
});

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(d);
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Lançamentos Financeiros</h2>
        <p class="subtitle">Controle de despesas, receitas e fluxo de caixa.</p>
      </div>
      <Button variant="primary" @click="openNovoLancamento">
        + Novo Lançamento
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="filters">
        <select v-model="tipoFilter" class="select-filter">
          <option value="">Todas as Movimentações</option>
          <option value="receita">Apenas Receitas</option>
          <option value="despesa">Apenas Despesas</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Data Comp.</th>
            <th>Vencimento</th>
            <th>Descrição</th>
            <th>Cliente / Fornecedor</th>
            <th>Tipo</th>
            <th>Status</th>
            <th class="text-right">Valor</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="8" class="empty-state">Carregando lançamentos...</td>
          </tr>
          <tr v-else-if="filteredLancamentos.length === 0">
            <td colspan="8" class="empty-state">
              Nenhum lançamento encontrado.
            </td>
          </tr>
          <tr v-else v-for="lancamento in filteredLancamentos" :key="lancamento.id">
            <td class="font-mono text-sm">{{ formatDate(lancamento.data_competencia) }}</td>
            <td class="font-mono text-sm text-secondary">{{ formatDate(lancamento.data_vencimento || '') }}</td>
            <td class="font-medium text-primary">{{ lancamento.descricao }}</td>
            <td>
              {{ lancamento.clientes?.razao_social || lancamento.fornecedores?.razao_social || '-' }}
            </td>
            <td>
              <span class="badge" :class="lancamento.tipo === 'receita' ? 'badge-success' : 'badge-danger'">
                {{ lancamento.tipo === 'receita' ? 'Receita' : 'Despesa' }}
              </span>
            </td>
            <td>
              <span class="badge" :class="lancamento.status === 'pago' ? 'badge-ghost' : 'badge-warning'">
                {{ lancamento.status }}
              </span>
            </td>
            <td class="font-medium text-right" :class="lancamento.tipo === 'receita' ? 'text-green' : 'text-red'">
              {{ lancamento.tipo === 'despesa' ? '-' : '' }}{{ formatMoney(lancamento.valor) }}
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(lancamento)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Lançamento' : 'Novo Lançamento'" size="xl">
      <div class="form-grid">
        <Select 
          v-model="form.tipo"
          label="Tipo de Lançamento" 
          :options="[{value: 'receita', label: 'Receita (Entrada)'}, {value: 'despesa', label: 'Despesa (Saída)'}]" 
        />
        <Select 
          v-model="form.status"
          label="Status" 
          :options="[{value: 'pendente', label: 'Pendente'}, {value: 'pago', label: 'Pago / Recebido'}, {value: 'atrasado', label: 'Atrasado'}]" 
        />
        
        <div class="col-span-2">
          <Input v-model="form.descricao" label="Descrição do Lançamento" placeholder="Ex: Manutenção da Empilhadeira 01" />
        </div>
        
        <Select 
          v-model="form.cliente_id"
          label="Cliente (Se Receita)" 
          :options="clienteOptions" 
        />
        <Select 
          v-model="form.fornecedor_id"
          label="Fornecedor (Se Despesa)" 
          :options="fornecedorOptions" 
        />
        
        <Select 
            v-model="form.conta_bancaria_id"
            label="Conta Bancária" 
            :options="contaOptions" 
          />
          <Input v-model="form.valor" label="Valor (R$)" type="number" />
          <Input v-model="form.data_competencia" label="Data de Competência" type="date" />
        <Input v-model="form.data_vencimento" label="Data de Vencimento" type="date" />
        <Input v-model="form.data_pagamento" label="Data de Pagamento (Opcional)" type="date" />
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitLancamento" :disabled="createLancamento.isPending.value || updateLancamento.isPending.value">
          {{ (createLancamento.isPending.value || updateLancamento.isPending.value) ? 'Salvando...' : 'Salvar Lançamento' }}
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn var(--transition-normal);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: var(--c-text-secondary);
  font-size: 0.875rem;
}

.toolbar {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--radius-lg);
  align-items: center;
}

.select-filter {
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-surface);
  color: var(--c-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
}

.table-container {
  border-radius: var(--radius-lg);
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.data-table th, .data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--c-border);
  font-size: 0.875rem;
}

.data-table th {
  background-color: rgba(0, 0, 0, 0.02);
  font-weight: 600;
  color: var(--c-text-secondary);
  white-space: nowrap;
}

[data-theme='dark'] .data-table th {
  background-color: rgba(255, 255, 255, 0.02);
}

.data-table tbody tr {
  transition: background-color var(--transition-fast);
}

.data-table tbody tr:hover {
  background-color: rgba(var(--c-primary), 0.05);
}

.font-medium {
  font-weight: 600;
}

.font-mono {
  font-family: monospace;
}

.text-primary {
  color: var(--c-text-primary);
}

.text-secondary {
  color: var(--c-text-secondary);
}

.text-sm {
  font-size: 0.75rem;
}

.text-right {
  text-align: right;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.badge {
  display: inline-flex;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge-success { background-color: rgba(34, 197, 94, 0.1); color: #16a34a; }
.badge-danger { background-color: rgba(239, 68, 68, 0.1); color: #dc2626; }
.badge-warning { background-color: rgba(245, 158, 11, 0.1); color: #d97706; }
.badge-ghost { background-color: rgba(100, 116, 139, 0.1); color: #64748b; }

.text-green { color: #16a34a; }
.text-red { color: #dc2626; }

[data-theme='dark'] .badge-success { color: #4ade80; }
[data-theme='dark'] .badge-danger { color: #f87171; }
[data-theme='dark'] .badge-warning { color: #fcd34d; }
[data-theme='dark'] .badge-ghost { color: #94a3b8; }
[data-theme='dark'] .text-green { color: #4ade80; }
[data-theme='dark'] .text-red { color: #fca5a5; }

.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--c-text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.col-span-2 {
  grid-column: span 2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--c-border);
}
</style>
