<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useMateriais, useCreateMaterial, useUpdateMaterial, type Material } from '@/composables/useApi';

const { data: materiais, isLoading } = useMateriais();
const createMaterial = useCreateMaterial();
const updateMaterial = useUpdateMaterial();

const search = ref('');
const filterFinalidade = ref('');
const isModalOpen = ref(false);
const editingMaterial = ref<Material | null>(null);

const form = ref({
  nome: '',
  finalidade: 'consumo',
  unidade_medida: 'un',
  custo_unitario: 0,
  valor_venda: 0,
  quantidade_estoque: 0,
  ativo: 'true'
});

const finalidadeOptions = [
  { value: 'consumo', label: 'Consumo Interno' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'revenda', label: 'Revenda' },
  { value: 'multiplo', label: 'Múltiplo (Revenda e Manutenção)' }
];

const filteredMateriais = computed(() => {
  if (!materiais.value) return [];
  return materiais.value.filter(m => {
    const matchName = m.nome.toLowerCase().includes(search.value.toLowerCase());
    const matchFinalidade = filterFinalidade.value ? m.finalidade === filterFinalidade.value : true;
    return matchName && matchFinalidade;
  });
});

const formatMoney = (val: number) => {
  if (val == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const getEstoqueStatusClass = (qtd: number) => {
  if (qtd <= 5) return 'status-badge danger';
  if (qtd <= 15) return 'status-badge warning';
  return 'status-badge success';
};

const openCreateModal = () => {
  editingMaterial.value = null;
  form.value = {
    nome: '',
    finalidade: 'consumo',
    unidade_medida: 'un',
    custo_unitario: 0,
    valor_venda: 0,
    quantidade_estoque: 0,
    ativo: 'true'
  };
  isModalOpen.value = true;
};

const openEditModal = (material: Material) => {
  editingMaterial.value = material;
  form.value = {
    nome: material.nome,
    finalidade: material.finalidade,
    unidade_medida: material.unidade_medida || 'un',
    custo_unitario: material.custo_unitario || 0,
    valor_venda: material.valor_venda || 0,
    quantidade_estoque: material.quantidade_estoque || 0,
    ativo: material.ativo ? 'true' : 'false'
  };
  isModalOpen.value = true;
};

const saveMaterial = async () => {
  const data = { ...form.value, ativo: form.value.ativo === 'true' };
  if (editingMaterial.value) {
    await updateMaterial.mutateAsync({ id: editingMaterial.value.id, data });
  } else {
    await createMaterial.mutateAsync(data);
  }
  isModalOpen.value = false;
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Materiais (Produtos)</h1>
        <p class="page-subtitle">Gerencie peças, insumos de manutenção e produtos de revenda.</p>
      </div>
      <Button variant="primary" @click="openCreateModal">
        <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Novo Material
      </Button>
    </div>

    <div class="toolbar glass">
      <div class="search-box">
        <svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="text" placeholder="Buscar material por nome..." class="search-input" />
      </div>
      
      <div class="filters">
        <Select v-model="filterFinalidade" :options="[{value: '', label: 'Todas as Finalidades'}, ...finalidadeOptions]" />
      </div>
    </div>

    <div class="table-container glass">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando materiais...</p>
      </div>
      
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Finalidade</th>
            <th>Estoque</th>
            <th>Custo Unt.</th>
            <th>Venda Unt.</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredMateriais.length === 0">
            <td colspan="6" class="text-center py-8 text-secondary">Nenhum material encontrado.</td>
          </tr>
          <tr v-for="material in filteredMateriais" :key="material.id">
            <td>
              <div class="font-medium">{{ material.nome }}</div>
              <div class="text-xs text-secondary mt-1">Status: <span :class="material.ativo ? 'text-green-500' : 'text-red-500'">{{ material.ativo ? 'Ativo' : 'Inativo' }}</span></div>
            </td>
            <td>
              <span class="status-badge" style="background: var(--c-surface-tertiary); color: var(--c-text-primary);">
                {{ finalidadeOptions.find(o => o.value === material.finalidade)?.label || material.finalidade }}
              </span>
            </td>
            <td>
              <div class="flex items-center gap-2">
                <span :class="getEstoqueStatusClass(material.quantidade_estoque || 0)">
                  {{ material.quantidade_estoque || 0 }} {{ material.unidade_medida }}
                </span>
              </div>
            </td>
            <td class="font-medium text-red-600 dark:text-red-400">
              {{ formatMoney(material.custo_unitario || 0) }}
            </td>
            <td class="font-medium text-green-600 dark:text-green-400">
              {{ formatMoney(material.valor_venda || 0) }}
            </td>
            <td class="text-right">
              <button class="action-btn" @click="openEditModal(material)" title="Editar">
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
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingMaterial ? 'Editar Material' : 'Novo Material'">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.nome" label="Nome do Material" placeholder="Ex: Óleo Lubrificante 15W40" required />
        </div>
        
        <Select v-model="form.finalidade" label="Finalidade" :options="finalidadeOptions" />
        <Input v-model="form.unidade_medida" label="Un. Medida" placeholder="Ex: un, L, kg" />
        
        <Input v-model="form.custo_unitario" type="number" label="Custo Unitário (R$)" min="0" step="0.01" />
        <Input v-model="form.valor_venda" type="number" label="Valor de Venda (R$)" min="0" step="0.01" />
        
        <Input v-model="form.quantidade_estoque" type="number" label="Estoque Atual" min="0" />
        <Select v-model="form.ativo" label="Status" :options="[{value: 'true', label: 'Ativo'}, {value: 'false', label: 'Inativo'}]" />
      </div>
      
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
          <Button variant="primary" @click="saveMaterial" :disabled="createMaterial.isPending || updateMaterial.isPending">
            {{ (createMaterial.isPending || updateMaterial.isPending) ? 'Salvando...' : 'Salvar Material' }}
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
