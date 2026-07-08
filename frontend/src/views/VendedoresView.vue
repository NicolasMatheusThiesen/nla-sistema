<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useVendedores, useCreateVendedor, useUpdateVendedor, type Vendedor } from '@/composables/useApi';

const filterStatus = ref('ativos');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: vendedores, isLoading } = useVendedores();

const createVendedor = useCreateVendedor();
const updateVendedor = useUpdateVendedor();

const form = ref<Partial<Vendedor>>({
  nome: '',
  cpf: '',
  email: '',
  telefone: '',
  percentual_comissao_padrao: 0,
  ativo: 'true'
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    percentual_comissao_padrao: 0,
    ativo: 'true'
  };
};

const openNovoVendedor = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (vendedor: Vendedor) => {
  editingId.value = vendedor.id;
  form.value = { ...vendedor, ativo: vendedor.ativo ? 'true' : 'false' };
  isModalOpen.value = true;
};

const submitVendedor = async () => {
  if (!form.value.nome) {
    alert("O nome é obrigatório.");
    return;
  }

  const data = { ...form.value, ativo: form.value.ativo === 'true' };

  if (editingId.value) {
    updateVendedor.mutate({ id: editingId.value, data }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar vendedor: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createVendedor.mutate(data as any, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar vendedor: " + (err?.response?.data?.error || err.message))
    });
  }
};

const filteredVendedores = computed(() => {
  if (!vendedores.value) return [];
  
  return vendedores.value.filter(v => {
    if (filterStatus.value === 'ativos') return v.ativo;
    if (filterStatus.value === 'inativos') return !v.ativo;
    return true; // 'todos'
  });
});
</script>

<template>
  <div class="vendedores-page">
    <div class="header-section">
      <div>
        <h2 class="title">Equipe de Vendas</h2>
        <p class="subtitle">Gerencie seus vendedores e comissões.</p>
      </div>
      <Button variant="primary" @click="openNovoVendedor">
        + Novo Vendedor
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="filters">
        <select v-model="filterStatus" class="filter-select">
          <option value="ativos">Apenas Ativos</option>
          <option value="inativos">Apenas Inativos</option>
          <option value="todos">Todos</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <div v-if="isLoading" class="p-8 text-center text-gray-500">
        Carregando vendedores...
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nome do Vendedor</th>
            <th>Contato</th>
            <th>Comissão Padrão</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredVendedores.length === 0">
            <td colspan="5" class="text-center p-8 text-gray-500">Nenhum vendedor encontrado.</td>
          </tr>
          <tr v-for="vendedor in filteredVendedores" :key="vendedor.id" class="table-row">
            <td class="font-medium">{{ vendedor.nome }}
              <div v-if="vendedor.cpf" class="text-xs text-gray-400">CPF: {{ vendedor.cpf }}</div>
            </td>
            <td>
              <div>{{ vendedor.telefone || '-' }}</div>
              <div class="text-xs text-gray-500">{{ vendedor.email }}</div>
            </td>
            <td>
              <span class="font-medium text-blue-600">{{ vendedor.percentual_comissao_padrao }}%</span>
            </td>
            <td>
              <span class="badge" :class="vendedor.ativo ? 'badge-green' : 'badge-ghost'">
                {{ vendedor.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(vendedor)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Vendedor' : 'Novo Vendedor'" size="md">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.nome" label="Nome Completo" placeholder="Ex: João Silva" />
        </div>
        
        <Input v-model="form.cpf" label="CPF" placeholder="000.000.000-00" />
        <Input v-model="form.telefone" label="Telefone" placeholder="(00) 00000-0000" />
        
        <div class="col-span-2">
          <Input v-model="form.email" label="E-mail" type="email" placeholder="vendedor@email.com" />
        </div>

        <Input v-model="form.percentual_comissao_padrao" label="Comissão Padrão (%)" type="number" min="0" step="0.1" />
        <Select 
          v-model="form.ativo"
          label="Status" 
          :options="[{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}]" 
        />
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitVendedor" :disabled="createVendedor.isPending.value || updateVendedor.isPending.value">
          {{ (createVendedor.isPending.value || updateVendedor.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Concluir Vendedor') }}
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.vendedores-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn var(--transition-normal);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.header-section .title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}
.header-section .subtitle {
  color: var(--c-text-secondary);
  font-size: 0.875rem;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 1rem;
  border-radius: var(--radius-lg);
}

.filters {
  display: flex;
  gap: 0.75rem;
}

.filter-select {
  padding: 0.75rem 1rem;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background-color: var(--c-bg-primary);
  color: var(--c-text-primary);
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

.data-table th {
  padding: 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--c-text-secondary);
  border-bottom: 1px solid var(--c-border);
  background-color: rgba(0, 0, 0, 0.02);
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--c-border);
  font-size: 0.875rem;
}

.table-row {
  transition: background-color var(--transition-fast);
}

.table-row:hover {
  background-color: var(--c-bg-secondary);
}

.badge {
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-green { background-color: rgba(34, 197, 94, 0.1); color: #16a34a; }
.badge-ghost { background-color: var(--c-bg-tertiary); color: var(--c-text-secondary); }

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
  padding: 1.5rem 0;
}

.col-span-2 {
  grid-column: span 2;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--c-border);
}
</style>
