<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useMaquinas, useCreateMaquina, useUpdateMaquina, type Maquina } from '@/composables/useApi';

const search = ref('');
const statusFilter = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: maquinas, isLoading } = useMaquinas();
const createMaquina = useCreateMaquina();
const updateMaquina = useUpdateMaquina();

const form = ref<Partial<Maquina>>({
  nome: '',
  tipo: 'empilhadeira',
  marca: '',
  modelo: '',
  numero_serie: '',
  ano_fabricacao: undefined,
  valor_aquisicao: 0,
  valor_mercado: 0,
  capacidade_kg: undefined,
  altura_max_elevacao: undefined,
  status: 'disponivel',
  custo_mensal_estimado: 0,
  observacoes: ''
});

const filteredMaquinas = computed(() => {
  if (!maquinas.value) return [];
  return maquinas.value.filter(m => {
    const matchSearch = m.nome.toLowerCase().includes(search.value.toLowerCase()) || 
                        (m.numero_serie && m.numero_serie.includes(search.value));
    const matchStatus = statusFilter.value ? m.status === statusFilter.value : true;
    return matchSearch && matchStatus;
  });
});

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const getStatusClass = (status: string) => {
  if (status === 'disponivel') return 'badge-success';
  if (status === 'locada') return 'badge-primary';
  if (status === 'manutencao') return 'badge-warning';
  return 'badge-ghost';
};

const resetForm = () => {
  editingId.value = null;
  form.value = {
    nome: '',
    tipo: 'empilhadeira',
    marca: '',
    modelo: '',
    numero_serie: '',
    ano_fabricacao: undefined,
    valor_aquisicao: 0,
    valor_mercado: 0,
    capacidade_kg: undefined,
    altura_max_elevacao: undefined,
    status: 'disponivel',
    custo_mensal_estimado: 0,
    observacoes: ''
  };
};

const openNovaMaquina = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Maquina) => {
  editingId.value = item.id;
  form.value = { ...item };
  isModalOpen.value = true;
};

const submitMaquina = async () => {
  if (!form.value.nome) {
    alert("Preencha o Nome da Máquina.");
    return;
  }

  if (editingId.value) {
    updateMaquina.mutate({ id: editingId.value, data: form.value }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar máquina: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createMaquina.mutate(form.value, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar máquina: " + (err?.response?.data?.error || err.message))
    });
  }
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Máquinas</h2>
        <p class="subtitle">Gerencie o seu catálogo e frota de equipamentos.</p>
      </div>
      <Button variant="primary" @click="openNovaMaquina">
        + Nova Máquina
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="search-box">
        <Input v-model="search" placeholder="Buscar por Nome, Modelo ou Nº Série..." class="w-full" />
      </div>
      <div class="filters">
        <select v-model="statusFilter" class="select-filter">
          <option value="">Todos os Status</option>
          <option value="disponivel">Disponível</option>
          <option value="locada">Locada</option>
          <option value="manutencao">Manutenção</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Máquina</th>
            <th>Marca/Modelo</th>
            <th>Nº Série</th>
            <th>Tipo</th>
            <th>Valor Mercado</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="empty-state">Carregando máquinas...</td>
          </tr>
          <tr v-else-if="filteredMaquinas.length === 0">
            <td colspan="7" class="empty-state">
              Nenhuma máquina encontrada.
            </td>
          </tr>
          <tr v-else v-for="maquina in filteredMaquinas" :key="maquina.id">
            <td>
              <div class="font-medium text-primary">{{ maquina.nome }}</div>
              <div class="text-sm text-secondary">{{ maquina.ano_fabricacao || 'Sem Ano' }}</div>
            </td>
            <td>{{ maquina.marca }} / {{ maquina.modelo }}</td>
            <td class="font-mono text-sm">{{ maquina.numero_serie || '-' }}</td>
            <td class="capitalize">{{ maquina.tipo }}</td>
            <td class="font-medium">{{ formatMoney(maquina.valor_mercado) }}</td>
            <td>
              <span class="badge" :class="getStatusClass(maquina.status)">
                {{ maquina.status }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm">Histórico</Button>
              <Button variant="ghost" size="sm" @click="openEdit(maquina)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Máquina' : 'Nova Máquina'" size="xl">
      <div class="form-grid">
        <Input v-model="form.nome" label="Nome da Máquina (Apelido)" />
        <Select 
          v-model="form.tipo"
          label="Tipo" 
          :options="[{value: 'empilhadeira', label: 'Empilhadeira'}, {value: 'plataforma', label: 'Plataforma Elevatória'}, {value: 'outro', label: 'Outro'}]" 
        />
        <Input v-model="form.marca" label="Marca" />
        <Input v-model="form.modelo" label="Modelo" />
        <Input v-model="form.numero_serie" label="Número de Série" />
        <Input v-model="form.ano_fabricacao" label="Ano de Fabricação" type="number" />
        <Input v-model="form.valor_aquisicao" label="Valor de Aquisição (R$)" type="number" />
        <Input v-model="form.valor_mercado" label="Valor de Mercado (R$)" type="number" />
        <Input v-model="form.capacidade_kg" label="Capacidade (Kg)" type="number" />
        <Input v-model="form.altura_max_elevacao" label="Altura Máx. Elevação (m)" type="number" />
        
        <Select 
          v-model="form.status"
          label="Status Inicial" 
          :options="[{value: 'disponivel', label: 'Disponível'}, {value: 'locada', label: 'Locada'}, {value: 'manutencao', label: 'Manutenção'}]" 
        />
        <Input v-model="form.custo_mensal_estimado" label="Custo Mensal Estimado (R$)" type="number" />
        
        <div class="col-span-2">
          <Input v-model="form.observacoes" label="Observações Técnicas" />
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitMaquina" :disabled="createMaquina.isPending.value || updateMaquina.isPending.value">
          {{ (createMaquina.isPending.value || updateMaquina.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Salvar Máquina') }}
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

.capitalize {
  text-transform: capitalize;
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
.badge-primary { background-color: rgba(var(--c-primary), 0.2); color: var(--c-primary-hover); }
.badge-warning { background-color: rgba(245, 158, 11, 0.1); color: #d97706; }
.badge-ghost { background-color: rgba(100, 116, 139, 0.1); color: #64748b; }

[data-theme='dark'] .badge-success { color: #4ade80; }
[data-theme='dark'] .badge-primary { color: var(--c-primary); }
[data-theme='dark'] .badge-warning { color: #fcd34d; }
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
