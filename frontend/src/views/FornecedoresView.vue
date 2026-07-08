<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, type Fornecedor } from '@/composables/useApi';

const search = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: fornecedores, isLoading } = useFornecedores();
const createFornecedor = useCreateFornecedor();
const updateFornecedor = useUpdateFornecedor();

const form = ref<Partial<Fornecedor>>({
  tipo_pessoa: 'PJ',
  cpf_cnpj: '',
  razao_social: '',
  nome_fantasia: '',
  telefone: '',
  email: '',
  cidade: '',
  estado: '',
  ativo: 'true'
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    tipo_pessoa: 'PJ',
    cpf_cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: '',
    ativo: 'true'
  };
};

const openNovoFornecedor = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (fornecedor: Fornecedor) => {
  editingId.value = fornecedor.id;
  form.value = { ...fornecedor, ativo: fornecedor.ativo ? 'true' : 'false' };
  isModalOpen.value = true;
};

const submitFornecedor = async () => {
  if (!form.value.razao_social) {
    alert("Preencha a Razão Social.");
    return;
  }

  const data = { ...form.value, ativo: form.value.ativo === 'true' };

  if (editingId.value) {
    updateFornecedor.mutate({ id: editingId.value, data }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao atualizar fornecedor: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createFornecedor.mutate(data, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar fornecedor: " + (err?.response?.data?.error || err.message))
    });
  }
};

const filteredFornecedores = computed(() => {
  if (!fornecedores.value) return [];
  return fornecedores.value.filter(f => 
    f.razao_social.toLowerCase().includes(search.value.toLowerCase()) || 
    f.cpf_cnpj.includes(search.value)
  );
});

const formatDoc = (val: string) => {
  if (val.length === 14) return val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return val;
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Fornecedores</h2>
        <p class="subtitle">Gerencie os fornecedores de peças e serviços.</p>
      </div>
      <Button variant="primary" @click="openNovoFornecedor">
        + Novo Fornecedor
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="search-box">
        <Input v-model="search" placeholder="Buscar por Nome ou CNPJ..." class="w-full" />
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Fornecedor</th>
            <th>CPF/CNPJ</th>
            <th>Contato</th>
            <th>Local</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="empty-state">Carregando fornecedores...</td>
          </tr>
          <tr v-else-if="filteredFornecedores.length === 0">
            <td colspan="6" class="empty-state">
              Nenhum fornecedor encontrado.
            </td>
          </tr>
          <tr v-else v-for="fornecedor in filteredFornecedores" :key="fornecedor.id">
            <td>
              <div class="font-medium text-primary">{{ fornecedor.razao_social }}</div>
              <div class="text-sm text-secondary">{{ fornecedor.nome_fantasia }}</div>
            </td>
            <td class="font-mono text-sm">{{ formatDoc(fornecedor.cpf_cnpj) }}</td>
            <td>{{ fornecedor.telefone || '-' }}</td>
            <td>{{ fornecedor.cidade || '-' }}/{{ fornecedor.estado || '-' }}</td>
            <td>
              <span class="badge" :class="fornecedor.ativo ? 'badge-success' : 'badge-ghost'">
                {{ fornecedor.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(fornecedor)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'" size="xl">
      <div class="form-grid">
        <Select 
          v-model="form.tipo_pessoa"
          label="Tipo de Pessoa" 
          :options="[{value: 'PF', label: 'Pessoa Física (PF)'}, {value: 'PJ', label: 'Pessoa Jurídica (PJ)'}]" 
        />
        <Input v-model="form.cpf_cnpj" label="CNPJ ou CPF" />
        <Input v-model="form.razao_social" label="Razão Social" />
        <Input v-model="form.nome_fantasia" label="Nome Fantasia" />
        <Input v-model="form.telefone" label="Telefone" />
        <Input v-model="form.email" label="E-mail" type="email" />
        <Input v-model="form.cidade" label="Cidade" />
        <Input v-model="form.estado" label="Estado (UF)" />
        <Select 
          v-model="form.ativo"
          label="Status" 
          :options="[{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}]" 
        />
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitFornecedor" :disabled="createFornecedor.isPending.value || updateFornecedor.isPending.value">
          {{ (createFornecedor.isPending.value || updateFornecedor.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Salvar Fornecedor') }}
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
}

.badge-success { background-color: rgba(34, 197, 94, 0.1); color: #16a34a; }
.badge-ghost { background-color: rgba(100, 116, 139, 0.1); color: #64748b; }

[data-theme='dark'] .badge-success { color: #4ade80; }
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

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--c-border);
}
</style>
