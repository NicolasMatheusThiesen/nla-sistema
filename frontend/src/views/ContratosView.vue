<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useContratos, useCreateContrato, useClientes, type Contrato } from '@/composables/useApi';

const statusFilter = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: contratos, isLoading } = useContratos();
const { data: clientes } = useClientes();
const createContrato = useCreateContrato();

const clienteOptions = computed(() => {
  return (clientes.value || []).map(c => ({ value: c.id, label: c.razao_social }));
});

const form = ref<Partial<Contrato>>({
  numero: '',
  cliente_id: '',
  status: 'ativo',
  tipo_locacao: 'mensal',
  data_inicio: new Date().toISOString().split('T')[0],
  data_fim: '',
  dia_vencimento: 10,
  data_primeiro_vencimento: '',
  valor_mensal: 0
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    numero: '',
    cliente_id: '',
    status: 'ativo',
    tipo_locacao: 'mensal',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    dia_vencimento: 10,
    data_primeiro_vencimento: '',
    valor_mensal: 0
  };
};

const openNovoContrato = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Contrato) => {
  editingId.value = item.id;
  form.value = {
    ...item,
    data_inicio: item.data_inicio?.split('T')[0],
    data_fim: item.data_fim ? item.data_fim.split('T')[0] : '',
    data_primeiro_vencimento: item.data_primeiro_vencimento ? item.data_primeiro_vencimento.split('T')[0] : '',
    dia_vencimento: item.dia_vencimento || 10
  };
  isModalOpen.value = true;
};

const submitContrato = async () => {
  if (!form.value.cliente_id || !form.value.valor_mensal) {
    alert("Preencha Cliente e Valor Mensal.");
    return;
  }

  createContrato.mutate(form.value, {
    onSuccess: () => {
      isModalOpen.value = false;
      resetForm();
    },
    onError: (err: any) => alert("Erro ao salvar contrato: " + (err?.response?.data?.error || err.message))
  });
};

const filteredContratos = computed(() => {
  if (!contratos.value) return [];
  if (!statusFilter.value) return contratos.value;
  return contratos.value.filter(c => c.status === statusFilter.value);
});

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(d);
};

const getStatusClass = (status: string) => {
  if (status === 'ativo') return 'badge-success';
  if (status === 'pendente') return 'badge-warning';
  if (status === 'cancelado') return 'badge-danger';
  if (status === 'finalizado') return 'badge-ghost';
  return 'badge-ghost';
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Contratos de Locação</h2>
        <p class="subtitle">Gestão de contratos e faturamentos recorrentes.</p>
      </div>
      <Button variant="primary" @click="openNovoContrato">
        + Novo Contrato
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="filters">
        <select v-model="statusFilter" class="select-filter">
          <option value="">Todos os Status</option>
          <option value="ativo">Ativo</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nº Contrato</th>
            <th>Cliente</th>
            <th>Vigência</th>
            <th>Venc.</th>
            <th>Valor Mensal</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="empty-state">Carregando contratos...</td>
          </tr>
          <tr v-else-if="filteredContratos.length === 0">
            <td colspan="7" class="empty-state">
              Nenhum contrato encontrado.
            </td>
          </tr>
          <tr v-else v-for="contrato in filteredContratos" :key="contrato.id">
            <td class="font-mono font-medium text-primary">{{ contrato.numero }}</td>
            <td>
              <div class="font-medium">{{ contrato.clientes?.razao_social || 'Desconhecido' }}</div>
              <div class="text-sm text-secondary">{{ contrato.tipo_locacao }}</div>
            </td>
            <td class="text-sm text-secondary">
              {{ formatDate(contrato.data_inicio) }} a {{ contrato.data_fim ? formatDate(contrato.data_fim) : 'Indeterminado' }}
            </td>
            <td>Dia {{ contrato.dia_vencimento }}</td>
            <td class="font-medium">{{ formatMoney(contrato.valor_mensal) }}</td>
            <td>
              <span class="badge" :class="getStatusClass(contrato.status)">
                {{ contrato.status }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm">PDF</Button>
              <Button variant="ghost" size="sm" @click="openEdit(contrato)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Contrato' : 'Novo Contrato'" size="xl">
      <div class="form-grid">
        <Input v-model="form.numero" label="Número do Contrato" placeholder="Auto-gerado se vazio" />
        <Select 
          v-model="form.cliente_id"
          label="Selecione o Cliente" 
          :options="clienteOptions" 
        />
        <Select 
          v-model="form.tipo_locacao"
          label="Tipo de Locação" 
          :options="[{value: 'diaria', label: 'Diária'}, {value: 'mensal', label: 'Mensal'}, {value: 'anual', label: 'Anual'}]" 
        />
        <Select 
          v-model="form.status"
          label="Status" 
          :options="[{value: 'ativo', label: 'Ativo'}, {value: 'pendente', label: 'Pendente'}, {value: 'cancelado', label: 'Cancelado'}, {value: 'finalizado', label: 'Finalizado'}]" 
        />
        
        <Input v-model="form.data_inicio" label="Data de Início" type="date" required />
        <Input v-model="form.data_fim" label="Data de Fim (Opcional)" type="date" />
        
        <Input v-model="form.dia_vencimento" label="Dia de Vencimento" type="number" min="1" max="31" required />
        <Input v-model="form.data_primeiro_vencimento" label="1º Vencimento (Opcional)" type="date" />
        
        <Input v-model="form.valor_mensal" label="Valor Mensal (R$)" type="number" required />
        
        <div class="col-span-2">
          <!-- <Input label="Observações do Contrato" /> -->
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitContrato" :disabled="createContrato.isPending.value">
          {{ createContrato.isPending.value ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Salvar Contrato') }}
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
.badge-warning { background-color: rgba(245, 158, 11, 0.1); color: #d97706; }
.badge-danger { background-color: rgba(239, 68, 68, 0.1); color: #dc2626; }
.badge-ghost { background-color: rgba(100, 116, 139, 0.1); color: #64748b; }

[data-theme='dark'] .badge-success { color: #4ade80; }
[data-theme='dark'] .badge-warning { color: #fcd34d; }
[data-theme='dark'] .badge-danger { color: #f87171; }
[data-theme='dark'] .badge-ghost { color: #94a3b8; }

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
