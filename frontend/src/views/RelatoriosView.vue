<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';

// Fluxo de Caixa params
const mesInicio = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM
const mesFim = ref(new Date().toISOString().slice(0, 7)); // YYYY-MM

// Rentabilidade params
const periodoMeses = ref(12);

const handleDownload = (reportUrl: string) => {
  // Para autenticação, idealmente teríamos que passar o token de alguma forma. 
  // Considerando cookies JWT ou enviando o token na query string dependendo de como foi feito o backend.
  // Uma alternativa genérica:
  const token = localStorage.getItem('token');
  const urlComToken = `${reportUrl}&token=${token || ''}`; // Supondo que o backend aceite via query
  
  // Ou abrir diretamente caso o browser envie cookies
  window.open(reportUrl, '_blank');
};

const getReportUrl = (endpoint: string, params: Record<string, any>) => {
  const qs = new URLSearchParams(params).toString();
  return `/api/relatorios/${endpoint}?${qs}`;
};

</script>

<template>
  <div class="relatorios-page">
    <div class="header-section">
      <div>
        <h2 class="title">Relatórios e Exportações</h2>
        <p class="subtitle">Exporte dados consolidados em PDF e Excel para contabilidade e gestão.</p>
      </div>
    </div>

    <div class="reports-grid">
      
      <!-- Fluxo de Caixa -->
      <div class="report-card glass">
        <div class="report-icon bg-blue-light">
          <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="report-title">Fluxo de Caixa</h3>
        <p class="report-desc">Extrato detalhado de receitas, despesas e parcelas de contratos pagas e pendentes.</p>
        
        <div class="report-params">
          <Input v-model="mesInicio" label="Mês Inicial" type="month" />
          <Input v-model="mesFim" label="Mês Final" type="month" />
        </div>
        
        <div class="report-actions">
          <Button variant="outline" size="sm" @click="handleDownload(getReportUrl('fluxo-caixa', { mes_inicio: mesInicio, mes_fim: mesFim, formato: 'pdf' }))">
            Baixar PDF
          </Button>
          <Button variant="outline" size="sm" @click="handleDownload(getReportUrl('fluxo-caixa', { mes_inicio: mesInicio, mes_fim: mesFim, formato: 'excel' }))">
            Baixar Excel
          </Button>
        </div>
      </div>

      <!-- Rentabilidade da Frota -->
      <div class="report-card glass">
        <div class="report-icon bg-purple-light">
          <svg class="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h3 class="report-title">Rentabilidade da Frota</h3>
        <p class="report-desc">Cálculo de ROI (Retorno sobre Investimento) por máquina, avaliando custos de manutenção vs locações.</p>
        
        <div class="report-params">
          <Select 
            v-model="periodoMeses" 
            label="Período de Análise" 
            :options="[{value: 3, label: 'Últimos 3 Meses'}, {value: 6, label: 'Últimos 6 Meses'}, {value: 12, label: 'Últimos 12 Meses'}, {value: 24, label: 'Últimos 24 Meses'}]" 
          />
        </div>
        
        <div class="report-actions mt-auto">
          <Button variant="outline" size="sm" @click="handleDownload(getReportUrl('rentabilidade', { periodo_meses: periodoMeses, formato: 'pdf' }))">
            Baixar PDF
          </Button>
          <Button variant="outline" size="sm" @click="handleDownload(getReportUrl('rentabilidade', { periodo_meses: periodoMeses, formato: 'excel' }))">
            Baixar Excel
          </Button>
        </div>
      </div>

      <!-- Inadimplência -->
      <div class="report-card glass">
        <div class="report-icon bg-red-light">
          <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 class="report-title">Inadimplência</h3>
        <p class="report-desc">Relação completa de clientes com parcelas vencidas e valores pendentes agregados.</p>
        
        <div class="report-params">
          <p class="text-sm text-gray-500 italic">O relatório puxará a foto atual de todos os títulos vencidos até a data de hoje.</p>
        </div>
        
        <div class="report-actions mt-auto">
          <Button variant="outline" size="sm" @click="handleDownload(getReportUrl('inadimplencia', { formato: 'pdf' }))">
            Baixar PDF
          </Button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.relatorios-page {
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

.reports-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.report-card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border-radius: var(--radius-xl);
  height: 100%;
}

.report-icon {
  width: 3rem;
  height: 3rem;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.bg-blue-light { background-color: rgba(37, 99, 235, 0.1); }
.bg-purple-light { background-color: rgba(147, 51, 234, 0.1); }
.bg-red-light { background-color: rgba(239, 68, 68, 0.1); }

.report-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.report-desc {
  font-size: 0.875rem;
  color: var(--c-text-secondary);
  margin-bottom: 1.5rem;
  line-height: 1.5;
}

.report-params {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--c-bg-secondary);
  border-radius: var(--radius-md);
}

.report-actions {
  display: flex;
  gap: 0.75rem;
}

.report-actions button {
  flex: 1;
}
</style>
