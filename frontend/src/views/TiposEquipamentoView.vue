<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useTiposEquipamento, useCreateTipoEquipamento, useUpdateTipoEquipamento, type TipoEquipamento } from '@/composables/useApi';

const { data: tipos, isLoading } = useTiposEquipamento();
const createTipo = useCreateTipoEquipamento();
const updateTipo = useUpdateTipoEquipamento();

const search = ref('');
const isModalOpen = ref(false);
const editingTipo = ref<TipoEquipamento | null>(null);

const form = ref({
  nome: '',
  descricao: '',
  ativo: 'true'
});

const filteredTipos = computed(() => {
  if (!tipos.value) return [];
  return tipos.value.filter(t => t.nome.toLowerCase().includes(search.value.toLowerCase()));
});

const openCreateModal = () => {
  editingTipo.value = null;
  form.value = {
    nome: '',
    descricao: '',
    ativo: 'true'
  };
  isModalOpen.value = true;
};

const openEditModal = (tipo: TipoEquipamento) => {
  editingTipo.value = tipo;
  form.value = {
    nome: tipo.nome,
    descricao: tipo.descricao || '',
    ativo: tipo.ativo ? 'true' : 'false'
  };
  isModalOpen.value = true;
};

const saveTipo = async () => {
  const data = { ...form.value, ativo: form.value.ativo === 'true' };
  if (editingTipo.value) {
    await updateTipo.mutateAsync({ id: editingTipo.value.id, data });
  } else {
    await createTipo.mutateAsync(data);
  }
  isModalOpen.value = false;
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Tipos de Equipamento</h1>
        <p class="page-subtitle">Categorias e classificações para a frota de máquinas.</p>
      </div>
      <Button variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Novo Tipo
      </Button>
    </div>

    <div class="toolbar glass">
      <div class="search-box">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="text" placeholder="Buscar tipo..." class="search-input" />
      </div>
    </div>

    <div class="table-container glass">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando tipos...</p>
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Tipo / Categoria</th>
            <th>Descrição</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredTipos.length === 0">
            <td colspan="4" class="text-center py-8 text-secondary">Nenhum tipo de equipamento encontrado.</td>
          </tr>
          <tr v-for="tipo in filteredTipos" :key="tipo.id">
            <td class="font-medium">{{ tipo.nome }}</td>
            <td class="text-secondary max-w-md truncate">{{ tipo.descricao || '-' }}</td>
            <td>
              <span :class="tipo.ativo ? 'status-badge success' : 'status-badge danger'">
                {{ tipo.ativo ? 'Ativo' : 'Inativo' }}
              </span>
            </td>
            <td class="text-right">
              <button class="action-btn" @click="openEditModal(tipo)" title="Editar">
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
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingTipo ? 'Editar Tipo' : 'Novo Tipo'">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.nome" label="Nome do Tipo" placeholder="Ex: Empilhadeira, Trator..." required />
        </div>
        
        <div class="col-span-2">
          <Input v-model="form.descricao" label="Descrição (Opcional)" placeholder="Detalhes da categoria..." />
        </div>
        
        <Select v-model="form.ativo" label="Status" :options="[{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}]" />
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
          <Button variant="primary" @click="saveTipo" :disabled="createTipo.isPending || updateTipo.isPending">
            {{ (createTipo.isPending || updateTipo.isPending) ? 'Salvando...' : 'Salvar Tipo' }}
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
