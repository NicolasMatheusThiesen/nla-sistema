<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria, type Categoria } from '@/composables/useApi';

const activeTab = ref('categorias');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: categorias, isLoading } = useCategorias();
const createCategoria = useCreateCategoria();
const updateCategoria = useUpdateCategoria();
const deleteCategoria = useDeleteCategoria();

const form = ref<Partial<Categoria>>({
  nome: '',
  tipo: 'receita',
  cor: '#3b82f6'
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    nome: '',
    tipo: 'receita',
    cor: '#3b82f6'
  };
};

const openNovaCategoria = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Categoria) => {
  editingId.value = item.id;
  form.value = { ...item };
  isModalOpen.value = true;
};

const submitCategoria = async () => {
  if (!form.value.nome) {
    alert("O nome da categoria é obrigatório.");
    return;
  }

  if (editingId.value) {
    updateCategoria.mutate({ id: editingId.value, data: form.value }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar categoria: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createCategoria.mutate(form.value, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar categoria: " + (err?.response?.data?.error || err.message))
    });
  }
};

const handleDelete = (id: string) => {
  if (confirm("Tem certeza que deseja excluir esta categoria?")) {
    deleteCategoria.mutate(id, {
      onError: (err: any) => alert("Erro ao excluir: " + (err?.response?.data?.error || err.message))
    });
  }
};

const receitas = computed(() => (categorias.value || []).filter(c => c.tipo === 'receita'));
const despesas = computed(() => (categorias.value || []).filter(c => c.tipo === 'despesa'));

</script>

<template>
  <div class="config-page">
    <div class="header-section">
      <div>
        <h2 class="title">Configurações</h2>
        <p class="subtitle">Gerencie as preferências e parâmetros do sistema.</p>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header glass">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'empresa' }" 
          @click="activeTab = 'empresa'">
          Minha Empresa
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'categorias' }" 
          @click="activeTab = 'categorias'">
          Categorias Financeiras
        </button>
      </div>

      <!-- Tab Empresa -->
      <div v-if="activeTab === 'empresa'" class="tab-content glass">
        <h3 class="section-title">Dados da Empresa</h3>
        <p class="text-sm text-gray-500 mb-6">Em breve: Aqui você poderá atualizar logotipo, razão social, CNPJ e endereço que sairão nos contratos e faturas.</p>
        
        <div class="form-grid opacity-50 pointer-events-none">
          <Input label="Razão Social" placeholder="Sua Empresa LTDA" />
          <Input label="CNPJ" placeholder="00.000.000/0001-00" />
          <Input label="E-mail de Contato" placeholder="contato@empresa.com" />
          <Input label="Telefone" placeholder="(00) 0000-0000" />
        </div>
      </div>

      <!-- Tab Categorias -->
      <div v-if="activeTab === 'categorias'" class="tab-content glass">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h3 class="section-title">Categorias Financeiras</h3>
            <p class="text-sm text-gray-500">Organize seus lançamentos por categorias.</p>
          </div>
          <Button variant="primary" size="sm" @click="openNovaCategoria">+ Nova Categoria</Button>
        </div>

        <div v-if="isLoading" class="p-4 text-center text-gray-500">
          Carregando categorias...
        </div>
        <div v-else class="categorias-grid">
          
          <!-- Receitas -->
          <div class="categoria-col">
            <h4 class="font-medium mb-3 flex items-center gap-2 text-green-600">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              Receitas
            </h4>
            <div class="cat-list">
              <div v-for="cat in receitas" :key="cat.id" class="cat-item">
                <div class="flex items-center gap-3">
                  <span class="color-dot" :style="{ backgroundColor: cat.cor || '#10b981' }"></span>
                  <span class="font-medium">{{ cat.nome }}</span>
                </div>
                <div class="actions">
                  <button class="icon-btn text-blue-500 hover:text-blue-700" @click="openEdit(cat)">Editar</button>
                  <button class="icon-btn text-red-500 hover:text-red-700" @click="handleDelete(cat.id)">Excluir</button>
                </div>
              </div>
              <div v-if="receitas.length === 0" class="text-sm text-gray-400 p-2 text-center border border-dashed rounded">
                Nenhuma categoria de receita.
              </div>
            </div>
          </div>

          <!-- Despesas -->
          <div class="categoria-col">
            <h4 class="font-medium mb-3 flex items-center gap-2 text-red-600">
              <span class="w-2 h-2 rounded-full bg-red-500"></span>
              Despesas
            </h4>
            <div class="cat-list">
              <div v-for="cat in despesas" :key="cat.id" class="cat-item">
                <div class="flex items-center gap-3">
                  <span class="color-dot" :style="{ backgroundColor: cat.cor || '#ef4444' }"></span>
                  <span class="font-medium">{{ cat.nome }}</span>
                </div>
                <div class="actions">
                  <button class="icon-btn text-blue-500 hover:text-blue-700" @click="openEdit(cat)">Editar</button>
                  <button class="icon-btn text-red-500 hover:text-red-700" @click="handleDelete(cat.id)">Excluir</button>
                </div>
              </div>
              <div v-if="despesas.length === 0" class="text-sm text-gray-400 p-2 text-center border border-dashed rounded">
                Nenhuma categoria de despesa.
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- Modal Form Categoria -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Categoria' : 'Nova Categoria'" size="md">
      <div class="flex flex-col gap-4 py-4">
        <Input v-model="form.nome" label="Nome da Categoria" placeholder="Ex: Manutenção de Frota" />
        
        <Select 
          v-model="form.tipo"
          label="Tipo" 
          :options="[{value: 'receita', label: 'Receita (Entrada)'}, {value: 'despesa', label: 'Despesa (Saída)'}]" 
          :disabled="!!editingId"
        />
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cor de Identificação</label>
          <div class="flex gap-2 flex-wrap">
            <button 
              v-for="color in ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#64748b']"
              :key="color"
              class="w-8 h-8 rounded-full border-2 transition-all cursor-pointer"
              :class="form.cor === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent hover:scale-105'"
              :style="{ backgroundColor: color }"
              @click="form.cor = color"
              type="button"
            ></button>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitCategoria" :disabled="createCategoria.isPending.value || updateCategoria.isPending.value">
          {{ (createCategoria.isPending.value || updateCategoria.isPending.value) ? 'Salvando...' : 'Salvar Categoria' }}
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.config-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  animation: fadeIn var(--transition-normal);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-section .title {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}
.header-section .subtitle {
  color: var(--c-text-secondary);
  font-size: 0.875rem;
}

.tabs-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tabs-header {
  display: flex;
  padding: 0.5rem;
  border-radius: var(--radius-lg);
  gap: 0.5rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--c-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn:hover {
  color: var(--c-text-primary);
  background-color: rgba(0, 0, 0, 0.03);
}

[data-theme='dark'] .tab-btn:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  background-color: var(--c-primary);
  color: white;
  box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
}

.tab-content {
  padding: 2rem;
  border-radius: var(--radius-lg);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.categorias-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cat-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: var(--c-bg-primary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.cat-item:hover {
  border-color: var(--c-primary);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.color-dot {
  width: 1rem;
  height: 1rem;
  border-radius: 4px;
}

.actions {
  display: flex;
  gap: 1rem;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.cat-item:hover .actions {
  opacity: 1;
}

.icon-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-transform: uppercase;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--c-border);
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .categorias-grid {
    grid-template-columns: 1fr;
  }
}
</style>
