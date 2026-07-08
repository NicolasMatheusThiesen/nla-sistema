<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useClientes, useCreateCliente, useUpdateCliente, type Cliente } from '@/composables/useApi';

const search = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: clientes, isLoading } = useClientes();
const createCliente = useCreateCliente();
const updateCliente = useUpdateCliente();

const form = ref<Partial<Cliente>>({
  tipo_pessoa: 'PF',
  cpf_cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  email: '',
  telefone: '',
  telefone2: '',
  contato_financeiro: '',
  telefone_financeiro: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  limite_credito: 0,
  status_credito: 'bom',
  observacoes: '',
  ativo: true
});

const filteredClientes = computed(() => {
  if (!clientes.value) return [];
  return clientes.value.filter(c => 
    c.razao_social.toLowerCase().includes(search.value.toLowerCase()) || 
    c.cpf_cnpj.includes(search.value)
  );
});

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDoc = (val: string) => {
  if (val.length === 14) return val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return val;
};

const getStatusClass = (status: string) => {
  if (status === 'bom') return 'badge-success';
  if (status === 'regular') return 'badge-warning';
  return 'badge-danger';
};

const resetForm = () => {
  editingId.value = null;
  form.value = {
    tipo_pessoa: 'PF',
    cpf_cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    telefone: '',
    telefone2: '',
    contato_financeiro: '',
    telefone_financeiro: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    limite_credito: 0,
    status_credito: 'bom',
    observacoes: '',
    ativo: true
  };
};

const openNovoCliente = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Cliente) => {
  editingId.value = item.id;
  form.value = { ...item };
  isModalOpen.value = true;
};

const submitCliente = async () => {
  if (!form.value.razao_social || !form.value.cpf_cnpj) {
    alert("Preencha Razão Social e CPF/CNPJ.");
    return;
  }

  if (editingId.value) {
    updateCliente.mutate({ id: editingId.value, data: form.value }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar cliente: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createCliente.mutate(form.value, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar cliente: " + (err?.response?.data?.error || err.message))
    });
  }
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Clientes</h2>
        <p class="subtitle">Gerencie os clientes e seus limites de crédito.</p>
      </div>
      <Button variant="primary" @click="openNovoCliente">
        + Novo Cliente
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="search-box">
        <Input v-model="search" placeholder="Buscar por Nome ou CNPJ..." class="w-full" />
      </div>
      <div class="filters">
        <select class="select-filter">
          <option value="">Todos os Scores</option>
          <option value="bom">Bom</option>
          <option value="regular">Regular</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>CPF/CNPJ</th>
            <th>Contato</th>
            <th>Local</th>
            <th>Score</th>
            <th>Limite</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="empty-state">Carregando clientes...</td>
          </tr>
          <tr v-else-if="filteredClientes.length === 0">
            <td colspan="7" class="empty-state">
              Nenhum cliente encontrado.
            </td>
          </tr>
          <tr v-else v-for="cliente in filteredClientes" :key="cliente.id">
            <td>
              <div class="client-name">{{ cliente.razao_social }}</div>
              <div class="client-fantasy">{{ cliente.nome_fantasia }}</div>
            </td>
            <td class="font-mono">{{ formatDoc(cliente.cpf_cnpj) }}</td>
            <td>{{ cliente.telefone }}</td>
            <td>{{ cliente.cidade }}/{{ cliente.estado }}</td>
            <td>
              <span class="badge" :class="getStatusClass(cliente.status_credito)">
                {{ cliente.status_credito }}
              </span>
            </td>
            <td class="font-medium">{{ formatMoney(cliente.limite_credito) }}</td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm">Ver</Button>
              <Button variant="ghost" size="sm" @click="openEdit(cliente)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Cliente' : 'Novo Cliente'" size="xl">
      <div class="form-grid">
        <Select 
          v-model="form.tipo_pessoa"
          label="Tipo de Pessoa" 
          :options="[{value: 'PF', label: 'Pessoa Física (PF)'}, {value: 'PJ', label: 'Pessoa Jurídica (PJ)'}]" 
        />
        <Input v-model="form.cpf_cnpj" label="CPF ou CNPJ" />
        <Input v-model="form.razao_social" label="Razão Social / Nome Completo" />
        <Input v-model="form.nome_fantasia" label="Nome Fantasia" />
        <Input v-model="form.email" label="E-mail" type="email" />
        <Input v-model="form.telefone" label="Telefone Principal" />
        <Input v-model="form.telefone2" label="Telefone Secundário" />
        
        <!-- Contato Financeiro -->
        <Input v-model="form.contato_financeiro" label="Contato Financeiro (Nome)" />
        <Input v-model="form.telefone_financeiro" label="Telefone do Financeiro" />
        
        <!-- Endereço -->
        <Input v-model="form.cep" label="CEP" />
        <Input v-model="form.endereco" label="Endereço (Rua, Av)" />
        <Input v-model="form.numero" label="Número" />
        <Input v-model="form.complemento" label="Complemento" />
        <Input v-model="form.bairro" label="Bairro" />
        <Input v-model="form.cidade" label="Cidade" />
        <Input v-model="form.estado" label="Estado (UF)" />

        <!-- Crédito -->
        <Input v-model="form.limite_credito" label="Limite de Crédito (R$)" type="number" />
        <Select 
          v-model="form.status_credito"
          label="Status de Crédito" 
          :options="[{value: 'bom', label: 'Bom'}, {value: 'regular', label: 'Regular'}, {value: 'bloqueado', label: 'Bloqueado'}]" 
        />
        
        <!-- Extra -->
        <div class="col-span-2">
          <Input v-model="form.observacoes" label="Observações" />
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitCliente" :disabled="createCliente.isPending.value || updateCliente.isPending.value">
          {{ (createCliente.isPending.value || updateCliente.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Salvar Cliente') }}
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

.search-box {
  flex: 1;
  max-width: 400px;
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

.client-name {
  font-weight: 600;
  color: var(--c-text-primary);
}

.client-fantasy {
  font-size: 0.75rem;
  color: var(--c-text-secondary);
}

.font-mono {
  font-family: monospace;
}

.font-medium {
  font-weight: 600;
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

[data-theme='dark'] .badge-success { color: #4ade80; }
[data-theme='dark'] .badge-warning { color: #fcd34d; }
[data-theme='dark'] .badge-danger { color: #f87171; }

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
