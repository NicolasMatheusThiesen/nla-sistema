<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useCompras, useCreateCompra, useUpdateCompra, useFornecedores, useMateriais, type Compra } from '@/composables/useApi';

const search = ref('');
const finalidadeFilter = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: compras, isLoading } = useCompras();
const { data: fornecedores } = useFornecedores();
const { data: materiais } = useMateriais();

const createCompra = useCreateCompra();
const updateCompra = useUpdateCompra();

const fornecedorOptions = computed(() => {
  const options = (fornecedores.value || []).map(f => ({ value: f.id, label: f.razao_social }));
  options.unshift({ value: '', label: 'Sem Fornecedor' });
  return options;
});

const materialOptions = computed(() => {
  const options = (materiais.value || []).map(m => ({ value: m.id, label: `${m.nome} (${m.unidade_medida})` }));
  options.unshift({ value: '', label: 'Não aplicável (Outros)' });
  return options;
});

const form = ref<Partial<Compra>>({
  descricao: '',
  fornecedor_id: '',
  material_id: '',
  quantidade: 1,
  valor_unitario: 0,
  valor_total: 0,
  finalidade: 'consumo',
  data_compra: new Date().toISOString().split('T')[0],
  nota_fiscal: '',
  observacoes: ''
});

// Calcula valor total automaticamente
const updateValorTotal = () => {
  if (form.value.quantidade != null && form.value.valor_unitario != null) {
    form.value.valor_total = form.value.quantidade * form.value.valor_unitario;
  }
};

const resetForm = () => {
  editingId.value = null;
  form.value = {
    descricao: '',
    fornecedor_id: '',
    material_id: '',
    quantidade: 1,
    valor_unitario: 0,
    valor_total: 0,
    finalidade: 'consumo',
    data_compra: new Date().toISOString().split('T')[0],
    nota_fiscal: '',
    observacoes: ''
  };
};

const openNovaCompra = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Compra) => {
  editingId.value = item.id;
  form.value = {
    ...item,
    data_compra: item.data_compra?.split('T')[0]
  };
  isModalOpen.value = true;
};

const submitCompra = async () => {
  if (!form.value.descricao || !form.value.valor_total) {
    alert("Preencha Descrição e Valor Total.");
    return;
  }

  const payload = { ...form.value };
  if (!payload.fornecedor_id) delete payload.fornecedor_id;
  if (!payload.material_id) delete payload.material_id;

  if (editingId.value) {
    updateCompra.mutate({ id: editingId.value, data: payload }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar compra: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createCompra.mutate(payload, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar compra: " + (err?.response?.data?.error || err.message))
    });
  }
};

const filteredCompras = computed(() => {
  if (!compras.value) return [];
  let filtered = compras.value;
  
  if (search.value) {
    const s = search.value.toLowerCase();
    filtered = filtered.filter(c => 
      c.descricao.toLowerCase().includes(s) || 
      (c.fornecedores?.razao_social || '').toLowerCase().includes(s) ||
      (c.nota_fiscal || '').toLowerCase().includes(s)
    );
  }
  
  if (finalidadeFilter.value) {
    filtered = filtered.filter(c => c.finalidade === finalidadeFilter.value);
  }
  
  return filtered;
});

const formatMoney = (val: number) => {
  if (val == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(d);
};
</script>

<template>
  <div class="compras-page">
    <div class="header-section">
      <div>
        <h2 class="title">Compras e Suprimentos</h2>
        <p class="subtitle">Gerencie compras de peças, equipamentos e materiais de consumo.</p>
      </div>
      <Button variant="primary" @click="openNovaCompra">
        + Nova Compra
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="search-box">
        <svg class="search-icon w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="text" placeholder="Buscar por descrição, fornecedor ou NF..." class="search-input" />
      </div>
      
      <div class="filters">
        <select v-model="finalidadeFilter" class="filter-select">
          <option value="">Todas as Finalidades</option>
          <option value="consumo">Consumo Interno</option>
          <option value="revenda">Revenda / Peças</option>
        </select>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <div v-if="isLoading" class="p-8 text-center text-gray-500">
        Carregando compras...
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Fornecedor</th>
            <th>NF</th>
            <th>Finalidade</th>
            <th class="text-right">Valor Total</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredCompras.length === 0">
            <td colspan="7" class="text-center p-8 text-gray-500">Nenhuma compra encontrada.</td>
          </tr>
          <tr v-for="compra in filteredCompras" :key="compra.id" class="table-row">
            <td>{{ formatDate(compra.data_compra) }}</td>
            <td class="font-medium">
              {{ compra.descricao }}
              <div v-if="compra.materiais?.nome" class="text-xs text-gray-400">{{ compra.quantidade }}x {{ compra.materiais.nome }}</div>
            </td>
            <td>{{ compra.fornecedores?.razao_social || 'N/A' }}</td>
            <td>{{ compra.nota_fiscal || '-' }}</td>
            <td>
              <span class="badge" :class="compra.finalidade === 'revenda' ? 'badge-blue' : 'badge-ghost'">
                {{ compra.finalidade === 'revenda' ? 'Revenda' : 'Consumo' }}
              </span>
            </td>
            <td class="font-medium text-right text-red-600">
              -{{ formatMoney(compra.valor_total) }}
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(compra)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Compra' : 'Nova Compra'" size="xl">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.descricao" label="Descrição da Compra" placeholder="Ex: Peças para manutenção da Yale 01" />
        </div>
        
        <Select 
          v-model="form.fornecedor_id"
          label="Fornecedor" 
          :options="fornecedorOptions" 
        />
        <Select 
          v-model="form.finalidade"
          label="Finalidade" 
          :options="[{value: 'consumo', label: 'Consumo Interno / Manutenção'}, {value: 'revenda', label: 'Revenda / Estoque'}]" 
        />

        <div class="col-span-2 divider-label">Estoque (Opcional se for peça cadastrada)</div>
        
        <Select 
          v-model="form.material_id"
          label="Material / Peça" 
          :options="materialOptions" 
        />
        <Input v-model="form.quantidade" label="Quantidade" type="number" @input="updateValorTotal" />
        <Input v-model="form.valor_unitario" label="Valor Unitário (R$)" type="number" @input="updateValorTotal" />
        
        <div class="col-span-2 divider-label">Dados Fiscais e Financeiros</div>

        <Input v-model="form.valor_total" label="Valor Total (R$)" type="number" />
        <Input v-model="form.data_compra" label="Data da Compra" type="date" />
        <Input v-model="form.nota_fiscal" label="Nota Fiscal (Opcional)" />
        
        <div class="col-span-2">
          <Input v-model="form.observacoes" label="Observações" />
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitCompra" :disabled="createCompra.isPending.value || updateCompra.isPending.value">
          {{ (createCompra.isPending.value || updateCompra.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Concluir Compra') }}
        </Button>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.compras-page {
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
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-radius: var(--radius-lg);
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 250px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--c-text-tertiary);
  width: 1.25rem;
  height: 1.25rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  background-color: var(--c-bg-primary);
  color: var(--c-text-primary);
  outline: none;
  transition: all var(--transition-fast);
}

.search-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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

.badge-blue { background-color: rgba(59, 130, 246, 0.1); color: #2563eb; }
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

.divider-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--c-text-secondary);
  border-bottom: 1px solid var(--c-border);
  padding-bottom: 0.5rem;
  margin-top: 0.5rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--c-border);
}
</style>
