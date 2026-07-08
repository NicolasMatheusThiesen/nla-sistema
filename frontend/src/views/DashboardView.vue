<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { ApexOptions } from 'apexcharts';
import VueApexCharts from 'vue3-apexcharts';
import { useDashboard } from '@/composables/useApi';
import Input from '@/components/ui/Input.vue';

const mesFilter = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM
const queryParams = computed(() => ({ mes: mesFilter.value }));
const { data: dashboardData, isLoading } = useDashboard(queryParams as any);

const formatMoney = (val: number) => {
  if (val == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

// Charts Configuration
const chartOptionsFluxo = ref<ApexOptions>({
  chart: {
    type: 'area',
    fontFamily: 'Outfit, sans-serif',
    toolbar: { show: false },
    background: 'transparent'
  },
  colors: ['#3b82f6', '#ef4444'],
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  xaxis: {
    categories: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
    labels: { style: { colors: 'var(--c-text-secondary)' } },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    labels: {
      style: { colors: 'var(--c-text-secondary)' },
      formatter: (val: number) => {
        if (val >= 1000) return `R$${(val/1000).toFixed(1)}k`;
        return `R$${val.toFixed(0)}`;
      }
    }
  },
  tooltip: {
    y: {
      formatter: (val: number) => formatMoney(val)
    }
  },
  grid: {
    borderColor: 'var(--c-border)',
    strokeDashArray: 4,
    yaxis: { lines: { show: true } }
  },
  theme: { mode: 'light' },
  fill: {
    type: 'gradient',
    gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }
  },
  legend: { show: false }
});

const seriesFluxo = ref([
  { name: 'Entradas', data: [0,0,0,0,0,0,0,0,0,0,0,0] },
  { name: 'Saídas', data: [0,0,0,0,0,0,0,0,0,0,0,0] }
]);

const chartOptionsFrota = ref<ApexOptions>({
  chart: {
    type: 'donut',
    fontFamily: 'Outfit, sans-serif',
    background: 'transparent'
  },
  labels: ['Disponíveis', 'Locadas', 'Manutenção'],
  colors: ['#22c55e', '#3b82f6', '#f59e0b'],
  stroke: { show: false },
  dataLabels: { enabled: false },
  legend: {
    position: 'bottom',
    labels: { colors: 'var(--c-text-primary)' }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '75%',
        labels: {
          show: true,
          name: { color: 'var(--c-text-secondary)' },
          value: { color: 'var(--c-text-primary)', fontSize: '24px', fontWeight: 600 }
        }
      }
    }
  },
  theme: { mode: 'light' }
});

const seriesFrota = ref([0, 0, 0]);

watch(dashboardData, (newData) => {
  if (newData) {
    const kpis = newData.kpis;
    seriesFrota.value = [
      kpis.maquinas_disponiveis || 0,
      kpis.maquinas_locadas || 0,
      kpis.maquinas_manutencao || 0
    ];

    if (newData.fluxo_mensal && newData.fluxo_mensal.length > 0) {
      const entradas = newData.fluxo_mensal.map(f => f.receita || 0);
      const saidas = newData.fluxo_mensal.map(f => f.despesa || 0);
      const cats = newData.fluxo_mensal.map(f => f.mes || '');
      seriesFluxo.value = [
        { name: 'Entradas', data: entradas },
        { name: 'Saídas', data: saidas }
      ];
      chartOptionsFluxo.value = { ...chartOptionsFluxo.value, xaxis: { ...chartOptionsFluxo.value.xaxis, categories: cats } };
    }
  }
}, { immediate: true });

</script>

<template>
  <div class="dashboard-page">
    <div class="header-section flex justify-between items-end">
      <div>
        <h2 class="title">Dashboard</h2>
        <p class="subtitle">Visão geral e indicadores do sistema NLA.</p>
      </div>
      <div class="w-48">
        <Input v-model="mesFilter" type="month" label="" placeholder="Mês Competência" />
      </div>
    </div>

    <!-- Alertas -->
    <div v-if="dashboardData?.alertas?.length" class="alertas-section">
      <div 
        v-for="(alerta, index) in dashboardData.alertas" 
        :key="index"
        class="alerta-card"
        :class="alerta.tipo === 'inadimplencia' ? 'is-danger' : 'is-warning'"
      >
        <div class="alerta-icon">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="alerta-content">
          {{ alerta.mensagem }} <span v-if="alerta.valor" class="font-bold">— {{ formatMoney(alerta.valor) }}</span>
        </div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpis-grid">
      <!-- Receita -->
      <div class="kpi-card bg-blue">
        <div class="kpi-header">
          <p class="kpi-title">Receita do Mês</p>
          <div class="kpi-icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="kpi-value">{{ formatMoney(dashboardData?.kpis?.receita_mes || 0) }}</p>
        <p class="kpi-subtitle">Pendente: {{ formatMoney(dashboardData?.kpis?.receita_pendente || 0) }}</p>
      </div>

      <!-- Despesas -->
      <div class="kpi-card bg-red">
        <div class="kpi-header">
          <p class="kpi-title">Despesas do Mês</p>
          <div class="kpi-icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>
        <p class="kpi-value">{{ formatMoney(dashboardData?.kpis?.custo_manutencao_mes || 0) }}</p>
        <p class="kpi-subtitle">Saídas e manutenções</p>
      </div>

      <!-- Lucro -->
      <div class="kpi-card bg-green">
        <div class="kpi-header">
          <p class="kpi-title">Lucro Líquido</p>
          <div class="kpi-icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p class="kpi-value">{{ formatMoney(dashboardData?.kpis?.lucro_liquido || 0) }}</p>
        <p class="kpi-subtitle">Despesas: {{ formatMoney(dashboardData?.kpis?.custo_manutencao_mes || 0) }}</p>
      </div>

      <!-- Ocupação -->
      <div class="kpi-card bg-purple">
        <div class="kpi-header">
          <p class="kpi-title">Ocupação da Frota</p>
          <div class="kpi-icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9" />
            </svg>
          </div>
        </div>
        <p class="kpi-value">{{ dashboardData?.kpis?.ocupacao_frota || 0 }}%</p>
        <p class="kpi-subtitle">{{ dashboardData?.kpis?.maquinas_locadas || 0 }} de {{ dashboardData?.kpis?.total_maquinas || 0 }} máquinas</p>
      </div>

      <!-- Inadimplência -->
      <div class="kpi-card bg-red">
        <div class="kpi-header">
          <p class="kpi-title">Inadimplência</p>
          <div class="kpi-icon">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <p class="kpi-value">{{ formatMoney(dashboardData?.kpis?.inadimplencia || 0) }}</p>
        <p class="kpi-subtitle">Total vencido em aberto</p>
      </div>
    </div>
    
    <!-- Charts Grid -->
    <div class="charts-grid">
      <!-- Fluxo de Caixa -->
      <div class="chart-card glass main-chart">
        <div class="chart-header">
          <div>
            <h3 class="card-title">Fluxo de Caixa</h3>
            <p class="card-subtitle">Últimos 12 meses</p>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot bg-blue"></span> Entradas</span>
            <span class="legend-item"><span class="dot bg-red"></span> Saídas</span>
          </div>
        </div>
        <div class="chart-wrapper">
          <VueApexCharts type="area" height="300" :options="chartOptionsFluxo" :series="seriesFluxo" />
        </div>
      </div>

      <!-- Status da Frota -->
      <div class="chart-card glass side-chart">
        <div class="chart-header">
          <div>
            <h3 class="card-title">Status da Frota</h3>
            <p class="card-subtitle">{{ dashboardData?.kpis?.total_maquinas || 0 }} máquinas no total</p>
          </div>
        </div>
        <div class="chart-wrapper">
          <VueApexCharts type="donut" height="280" :options="chartOptionsFrota" :series="seriesFrota" />
        </div>
        <div class="quick-stats">
          <div class="stat-box bg-green-light">
            <p class="stat-value text-green">{{ dashboardData?.kpis?.maquinas_disponiveis || 0 }}</p>
            <p class="stat-label text-green-dark">Disponíveis</p>
          </div>
          <div class="stat-box bg-blue-light">
            <p class="stat-value text-blue">{{ dashboardData?.kpis?.maquinas_locadas || 0 }}</p>
            <p class="stat-label text-blue-dark">Locadas</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
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

/* Alertas */
.alertas-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alerta-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.alerta-card.is-danger {
  background-color: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.2);
}

[data-theme='dark'] .alerta-card.is-danger {
  color: #fca5a5;
}

.alerta-card.is-warning {
  background-color: rgba(245, 158, 11, 0.1);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.2);
}

[data-theme='dark'] .alerta-card.is-warning {
  color: #fcd34d;
}

.alerta-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* KPIs */
.kpis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.kpi-card {
  padding: 1.25rem;
  border-radius: var(--radius-xl);
  color: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
}

.kpi-card::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%);
  border-radius: 50%;
  transform: translate(30%, -30%);
}

.bg-blue { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.bg-green { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.bg-purple { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); }
.bg-red { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.kpi-title {
  font-size: 0.875rem;
  font-weight: 500;
  opacity: 0.9;
}

.kpi-icon {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem;
  border-radius: var(--radius-md);
  backdrop-filter: blur(4px);
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  margin-bottom: 0.25rem;
}

.kpi-subtitle {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* Charts */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  padding: 1.25rem;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
}

.card-subtitle {
  font-size: 0.75rem;
  color: var(--c-text-secondary);
}

.chart-legend {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
}

.dot.bg-blue { background-color: #3b82f6; }
.dot.bg-red { background-color: #ef4444; }

.chart-wrapper {
  flex: 1;
  min-height: 250px;
}

/* Quick stats inside Donut */
.quick-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.stat-box {
  padding: 0.75rem;
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-box.bg-green-light { background-color: rgba(34, 197, 94, 0.1); }
.stat-box.bg-blue-light { background-color: rgba(59, 130, 246, 0.1); }

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.text-green { color: #16a34a; }
.text-green-dark { color: #15803d; }
.text-blue { color: #2563eb; }
.text-blue-dark { color: #1d4ed8; }

[data-theme='dark'] .text-green { color: #4ade80; }
[data-theme='dark'] .text-green-dark { color: #86efac; }
[data-theme='dark'] .text-blue { color: #60a5fa; }
[data-theme='dark'] .text-blue-dark { color: #93c5fd; }
</style>
