<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/ui/Button.vue';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import { useContasBancarias, useCreateContaBancaria, useUpdateContaBancaria, useDeleteContaBancaria, type ContaBancaria } from '@/composables/useApi';

const search = ref('');
const isModalOpen = ref(false);
const editingId = ref<string | null>(null);

const { data: contas, isLoading } = useContasBancarias();
const createConta = useCreateContaBancaria();
const updateConta = useUpdateContaBancaria();
const deleteConta = useDeleteContaBancaria();

const form = ref<Partial<ContaBancaria>>({
  nome: '',
  banco: '',
  agencia: '',
  conta: '',
  saldo_inicial: 0,
  saldo_atual: 0,
  ativo: true
});

const filteredContas = computed(() => {
  if (!contas.value) return [];
  const s = search.value.toLowerCase();
  return contas.value.filter(c => 
    c.nome.toLowerCase().includes(s) || 
    (c.banco && c.banco.toLowerCase().includes(s))
  );
});

const openNovaConta = () => {
  editingId.value = null;
  form.value = {
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    saldo_inicial: 0,
    saldo_atual: 0,
    ativo: true
  };
  isModalOpen.value = true;
};

const openEdit = (conta: ContaBancaria) => {
  editingId.value = conta.id;
  form.value = { ...conta };
  isModalOpen.value = true;
};

const formatMoney = (val: number | undefined) => {
  if (val === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const saveConta = async () => {
  try {
    const data = { ...form.value };
    if (editingId.value) {
      await updateConta.mutateAsync({ id: editingId.value, data });
    } else {
      await createConta.mutateAsync(data);
    }
    isModalOpen.value = false;
  } catch (error) {
    alert('Erro ao salvar conta banc�ria');
  }
};

const handleDelete = async (id: string) => {
  if (confirm('Deseja realmente excluir esta conta banc�ria?')) {
    try {
      await deleteConta.mutateAsync(id);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Erro ao excluir conta');
    }
  }
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Contas Banc�rias</h1>
        <p class="page-subtitle">Gerencie as contas banc�rias e carteiras da sua empresa</p>
      </div>
      <Button variant="primary" @click="openNovaConta">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        Nova Conta
      </Button>
    </div>

    <div class="toolbar glass">
      <div class="search-box">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input v-model="search" type="text" placeholder="Buscar contas..." class="search-input" />
      </div>
    </div>

    <div class="table-container glass">
      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>Carregando contas...</p>
      </div>
      <div v-else-if="filteredContas.length === 0" class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
        <p>Nenhuma conta banc�ria encontrada.</p>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Banco</th>
            <th>Ag./Conta</th>
            <th>Saldo Atual</th>
            <th>Status</th>
            <th class="text-right">A��es</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="conta in filteredContas" :key="conta.id">
            <td class="font-medium">{{ conta.nome }}</td>
            <td>{{ conta.banco || '-' }}</td>
            <td class="text-secondary">{{ conta.agencia ? conta.agencia + ' / ' + conta.conta : '-' }}</td>
            <td class="font-medium" :class="conta.saldo_atual >= 0 ? 'text-success' : 'text-danger'">
              {{ formatMoney(conta.saldo_atual) }}
            </td>
            <td>
              <span class="badge" :class="conta.ativo ? 'badge-success' : 'badge-danger'">
                {{ conta.ativo ? 'Ativa' : 'Inativa' }}
              </span>
            </td>
            <td class="text-right actions-cell">
              <Button variant="ghost" size="sm" @click="openEdit(conta)">Editar</Button>
              <Button variant="ghost" size="sm" class="text-danger" @click="handleDelete(conta.id)">Excluir</Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :open="isModalOpen" @close="isModalOpen = false" :title="editingId ? 'Editar Conta' : 'Nova Conta Banc�ria'">
      <div class="form-grid">
        <div class="col-span-2">
          <Input v-model="form.nome" label="Nome da Conta (Ex: Ita� Empresa, Caixinha)" required />
        </div>
        <Input v-model="form.banco" label="Banco" />
        <Input v-model="form.agencia" label="Ag�ncia" />
        <Input v-model="form.conta" label="Conta" />
        <Input v-model="form.saldo_inicial" label="Saldo Inicial (R$)" type="number" :disabled="!!editingId" />
        <div class="col-span-2 flex items-center mt-2">
           <label class="flex items-center gap-2 text-sm font-medium">
             <input type="checkbox" v-model="form.ativo" /> Conta Ativa
           </label>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <Button variant="outline" @click="isModalOpen = false">Cancelar</Button>
          <Button variant="primary" @click="saveConta" :disabled="createConta.isPending.value || updateConta.isPending.value">
            {{ (createConta.isPending.value || updateConta.isPending.value) ? 'Salvando...' : 'Salvar Conta' }}
          </Button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.text-success { color: #16a34a; }
.text-danger { color: #dc2626; }
[data-theme='dark'] .text-success { color: #4ade80; }
[data-theme='dark'] .text-danger { color: #f87171; }
</style>
