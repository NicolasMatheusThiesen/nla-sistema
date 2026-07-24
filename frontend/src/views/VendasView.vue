<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useVendas, useCreateVenda, useUpdateVenda, useClientes, useMaquinas, useContasBancarias, type Venda } from '@/composables/useApi';

const search = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: vendas, isLoading } = useVendas();
const { data: clientes } = useClientes();
const { data: maquinas } = useMaquinas();
const { data: contasBancarias } = useContasBancarias();
const createVenda = useCreateVenda();
const updateVenda = useUpdateVenda();

const clienteOptions = computed(() => {
  return (clientes.value || []).map(c => ({ value: c.id, label: c.razao_social }));
});

const maquinaOptions = computed(() => {
  const options = (maquinas.value || []).map(m => ({ value: m.id, label: m.nome }));
  options.unshift({ value: '', label: 'Venda de Produtos Apenas' });
  return options;
});

const contaOptions = computed(() => {
  const options = (contasBancarias.value || []).map(c => ({ value: c.id, label: `${c.nome} ${c.banco ? '- '+c.banco : ''}` }));
  options.unshift({ value: '', label: 'Nenhuma / Aguardando' });
  return options;
});

const form = ref<Partial<Venda>>({
  maquina_id: '',
  cliente_id: '',
  valor_custo: 0,
  valor_venda: 0,
  forma_pagamento: 'avista',
  numero_parcelas: 1,
  data_venda: new Date().toISOString().split('T')[0],
  vendedor_id: '',
  percentual_comissao: 0,
  valor_comissao: 0,
  observacoes: '',
  tipo_comissao: 'percentual',
  conta_bancaria_id: ''
});

const resetForm = () => {
  editingId.value = null;
  form.value = {
    maquina_id: '',
    cliente_id: '',
    valor_custo: 0,
    valor_venda: 0,
    forma_pagamento: 'avista',
    numero_parcelas: 1,
    data_venda: new Date().toISOString().split('T')[0],
    vendedor_id: '',
    percentual_comissao: 0,
    valor_comissao: 0,
    observacoes: '',
    tipo_comissao: 'percentual',
    conta_bancaria_id: ''
  };
};

const openNovaVenda = () => {
  resetForm();
  isModalOpen.value = true;
};

const openEdit = (item: Venda) => {
  editingId.value = item.id;
  form.value = {
    ...item,
    data_venda: item.data_venda?.split('T')[0]
  };
  isModalOpen.value = true;
};

const submitVenda = async () => {
  if (!form.value.cliente_id || !form.value.valor_venda) {
    alert("Preencha os campos obrigatórios (Cliente e Valor de Venda).");
    return;
  }

  if (editingId.value) {
    updateVenda.mutate({ id: editingId.value, data: form.value }, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao editar venda: " + (err?.response?.data?.error || err.message))
    });
  } else {
    createVenda.mutate(form.value, {
      onSuccess: () => {
        isModalOpen.value = false;
        resetForm();
      },
      onError: (err: any) => alert("Erro ao salvar venda: " + (err?.response?.data?.error || err.message))
    });
  }
};

const filteredVendas = computed(() => {
  if (!vendas.value) return [];
  return vendas.value.filter(v => {
    const nomeCliente = v.clientes?.razao_social || '';
    const nomeMaquina = v.maquinas?.nome || '';
    const q = search.value.toLowerCase();
    return nomeCliente.toLowerCase().includes(q) || nomeMaquina.toLowerCase().includes(q);
  });
});

const formatMoney = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR').format(d);
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h2 class="title">Vendas de Equipamentos</h2>
        <p class="subtitle">Acompanhe as vendas realizadas, clientes e lucros.</p>
      </div>
      <Button variant="primary" @click="openNovaVenda">
        + Nova Venda
      </Button>
    </div>

    <!-- Toolbar -->
    <div class="toolbar glass">
      <div class="search-box">
        <Input v-model="search" placeholder="Buscar por Cliente ou Máquina..." class="w-full" />
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container glass">
      <table class="data-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Máquina</th>
            <th>Valor Custo</th>
            <th>Valor Venda</th>
            <th>Lucro Bruto</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="empty-state">Carregando vendas...</td>
          </tr>
          <tr v-else-if="filteredVendas.length === 0">
            <td colspan="7" class="empty-state">
              Nenhuma venda registrada.
            </td>
          </tr>
          <tr v-else v-for="venda in filteredVendas" :key="venda.id">
            <td class="font-mono text-secondary">{{ formatDate(venda.data_venda) }}</td>
            <td class="font-medium text-primary">{{ venda.clientes?.razao_social || 'Desconhecido' }}</td>
            <td>{{ venda.maquinas?.nome || 'Máquina não informada' }}</td>
            <td class="text-secondary">{{ formatMoney(venda.valor_custo) }}</td>
            <td class="font-medium">{{ formatMoney(venda.valor_venda) }}</td>
            <td>
              <span class="badge badge-success">
                {{ formatMoney(venda.valor_venda - venda.valor_custo) }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(venda)">Editar</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Form -->
    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Venda' : 'Registrar Venda'" size="xl">
      <div class="form-grid">
        <Select 
          v-model="form.maquina_id"
          label="Selecione a Máquina (Opcional)" 
          :options="maquinaOptions" 
        />
        <Select 
          v-model="form.cliente_id"
          label="Selecione o Cliente" 
          :options="clienteOptions" 
        />
        <Input v-model="form.valor_custo" label="Valor de Custo Base (R$)" type="number" />
        <Input v-model="form.valor_venda" label="Valor de Venda Negociado (R$)" type="number" />
        
        <Select 
          v-model="form.forma_pagamento"
          label="Forma de Pagamento" 
          :options="[{value: 'avista', label: 'À Vista'}, {value: 'parcelado', label: 'A Prazo (Parcelado)'}, {value: 'financiado', label: 'Financiamento'}]" 
        />
        <Select 
          v-model="form.conta_bancaria_id"
          label="Conta Bancária (Recebimento)" 
          :options="contaOptions" 
        />
        <Input v-model="form.numero_parcelas" label="Número de Parcelas" type="number" />
        <Input v-model="form.data_venda" label="Data da Venda" type="date" />
        
        <Select 
          v-model="form.vendedor_id"
          label="Vendedor (Opcional)" 
          :options="[{value: '', label: 'Sem Vendedor'}]" 
        />
        <Input v-model="form.percentual_comissao" label="Comissão (%)" type="number" />
        <Input v-model="form.valor_comissao" label="Valor Comissão Fixo (R$)" type="number" />
        
        <div class="col-span-2">
          <Input v-model="form.observacoes" label="Observações da Negociação" />
        </div>
      </div>
      <div class="modal-actions">
        <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
        <Button variant="primary" @click="submitVenda" :disabled="createVenda.isPending.value || updateVenda.isPending.value">
          {{ (createVenda.isPending.value || updateVenda.isPending.value) ? 'Salvando...' : (editingId ? 'Salvar Edição' : 'Concluir Venda') }}
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
[data-theme='dark'] .badge-success { color: #4ade80; }

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
