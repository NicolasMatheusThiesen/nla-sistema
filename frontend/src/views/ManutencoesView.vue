<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useManutencoes, type Manutencao } from '@/composables/useApi';

const tipoFilter = ref('');
const isModalOpen = ref(false);

const { data: manutencoes, isLoading } = useManutencoes();

const filteredManutencoes = computed(() => {
  if (!manutencoes.value) return [];
  if (!tipoFilter.value) return manutencoes.value;
  return manutencoes.value.filter(m => m.tipo === tipoFilter.value);
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
  if (status === 'agendada') return 'badge-primary';
  if (status === 'em_andamento') return 'badge-warning';
  if (status === 'concluida') return 'badge-success';
  if (status === 'cancelada') return 'badge-danger';
  return 'badge-ghost';
};

const openNovaManutencao = () => {
  isModalOpen.value = true;
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Manutenções</h2>
        <p class="subtitle">Histórico e agendamento de revisões (preventivas e corretivas).</p>
      </div>
      <Button variant="primary" @click="openNovaManutencao">
        + Agendar Manutenção
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="filters">
        <select v-model="tipoFilter" class="select-filter">
          <option value="">Todas</option>
          <option value="preventiva">Preventiva</option>
          <option value="corretiva">Corretiva</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Data Agendada</th>
            <th>Máquina</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Custo (R$)</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="empty-state">Carregando manutenções...</td>
          </tr>
          <tr v-else-if="filteredManutencoes.length === 0">
            <td colspan="7" class="empty-state">
              Nenhuma manutenção agendada ou realizada.
            </td>
          </tr>
          <tr v-else v-for="manutencao in filteredManutencoes" :key="manutencao.id">
            <td class="font-mono text-sm">{{ formatDate(manutencao.data_agendada) }}</td>
            <td>
              <div class="font-medium text-primary">{{ manutencao.maquinas?.nome || 'Desconhecida' }}</div>
              <div class="text-sm text-secondary">{{ manutencao.maquinas?.numero_serie }}</div>
            </td>
            <td>
              <span class="badge" :class="manutencao.tipo === 'preventiva' ? 'badge-primary' : 'badge-warning'">
                {{ manutencao.tipo }}
              </span>
            </td>
            <td class="max-w-xs truncate" :title="manutencao.descricao">{{ manutencao.descricao }}</td>
            <td class="font-medium">{{ formatMoney(manutencao.custo) }}</td>
            <td>
              <span class="badge" :class="getStatusClass(manutencao.status)">
                {{ manutencao.status.replace('_', ' ') }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openNovaManutencao">Detalhes</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" title="Agendar Manutenção" size="xl">
      <div class="form-grid">
        <Select 
          label="Selecione a Máquina" 
          :options="[{value: '1', label: 'Empilhadeira Yale 2.5T'}]" 
        />
        <Select 
          label="Tipo de Manutenção" 
          :options="[{value: 'preventiva', label: 'Preventiva (Revisão/Óleo)'}, {value: 'corretiva', label: 'Corretiva (Quebra/Falha)'}]" 
        />
        
        <Select 
          label="Status" 
          :options="[{value: 'agendada', label: 'Agendada'}, {value: 'em_andamento', label: 'Em Andamento'}, {value: 'concluida', label: 'Concluída'}]" 
        />
        <Input label="Responsável (Técnico ou Oficina)" />
        
        <Input label="Data Agendada" type="date" />
        <Input label="Data Realizada (Opcional)" type="date" />
        
        <Input label="Custo Total (R$)" type="number" />
        
        <div class="col-span-2">
          <Input label="Descrição do Serviço / Peças Trocadas" />
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="isModalOpen = false">Salvar Manutenção</Button>
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

.max-w-xs {
  max-width: 20rem;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.badge-primary { background-color: rgba(var(--c-primary), 0.2); color: var(--c-primary-hover); }
.badge-ghost { background-color: rgba(100, 116, 139, 0.1); color: #64748b; }

[data-theme='dark'] .badge-success { color: #4ade80; }
[data-theme='dark'] .badge-danger { color: #f87171; }
[data-theme='dark'] .badge-warning { color: #fcd34d; }
[data-theme='dark'] .badge-primary { color: var(--c-primary); }
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
