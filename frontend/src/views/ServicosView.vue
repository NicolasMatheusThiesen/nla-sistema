<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useServicos, useCreateServico, useUpdateServico, type Servico } from '@/composables/useApi';

const { data: servicos, isLoading } = useServicos();
const createServico = useCreateServico();
const updateServico = useUpdateServico();

const search = ref('');
const isModalOpen = ref(false);
const editingServico = ref<Servico | null>(null);

const form = ref({
  nome: '',
  descricao: '',
  valor_padrao: 0,
  ativo: 'true'
});

const filteredServicos = computed(() => {
  if (!servicos.value) return [];
  return servicos.value.filter(s => s.nome.toLowerCase().includes(search.value.toLowerCase()));
});

const formatMoney = (val: number) => {
  if (val == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const openCreateModal = () => {
  editingServico.value = null;
  form.value = {
    nome: '',
    descricao: '',
    valor_padrao: 0,
    ativo: 'true'
  };
  isModalOpen.value = true;
};

const openEditModal = (servico: Servico) => {
  editingServico.value = servico;
  form.value = {
    nome: servico.nome,
    descricao: servico.descricao || '',
    valor_padrao: servico.valor_padrao || 0,
    ativo: servico.ativo ? 'true' : 'false'
  };
  isModalOpen.value = true;
};

const saveServico = async () => {
  const data = { ...form.value, ativo: form.value.ativo === 'true' };
  if (editingServico.value) {
    await updateServico.mutateAsync({ id: editingServico.value.id, data });
  } else {
    await createServico.mutateAsync(data);
  }
  isModalOpen.value = false;
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Serviços</h1>
        <p class="page-subtitle">Cadastro de serviços de mão de obra para Ordens de Serviço.</p>
      </div>
      <Button variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Novo Serviço
      </Button>
    </div>

    <div class="toolbar glass">
      <div class="search-box">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="text" placeholder="Buscar serviço..." class="search-input" />
      </div>
    </div>

    <div class="table-container glass">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando serviços...</p>
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>Descrição</th>
            <th>Valor Padrão</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredServicos.length === 0">
            <td colspan="5" class="text-center py-8 text-secondary">Nenhum serviço encontrado.</td>
          </tr>
          <tr v-for="servico in filteredServicos" :key="servico.id">
            <td class="font-medium">{{ servico.nome }}</td>
            <td class="text-secondary max-w-md truncate">{{ servico.descricao || '-' }}</td>
            <td class="font-medium text-blue-600 dark:text-blue-400">
              {{ formatMoney(servico.valor_padrao || 0) }}
            </td>
            <td>
              <span :class="servico.ativo ? 'status-badge success' : 'status-badge danger'">
                {{ servico.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="text-right">
              <button class="action-btn" @click="openEditModal(servico)" title="Editar">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Formulario -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingServico ? 'Editar Serviço' : 'Novo Serviço'">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.nome" label="Nome do Serviço" placeholder="Ex: Mão de obra mecânica" required />
        </div>
        
        <div class="col-span-2">
          <Input v-model="form.descricao" label="Descrição (Opcional)" placeholder="Detalhes sobre o serviço..." />
        </div>
        
        <Input v-model="form.valor_padrao" type="number" label="Valor Padrão (R$)" min="0" step="0.01" />
        <Select v-model="form.ativo" label="Status" :options="[{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}]" />
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
          <Button variant="primary" @click="saveServico" :disabled="createServico.isPending || updateServico.isPending">
            {{ (createServico.isPending || updateServico.isPending) ? 'Salvando...' : 'Salvar Serviço' }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-text-tertiary);
  width: 1.25rem;
  height: 1.25rem;
}
</style>
