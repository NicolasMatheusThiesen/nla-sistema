<script setup lang="ts">
import { ref } from 'vue';
import Button from '@/components/ui/Button.vue';
import { useImportNfe } from '@/composables/useApi';

const importNfe = useImportNfe();
const isDragging = ref(false);
const isProcessing = ref(false);
const resultMessage = ref('');
const resultType = ref<'success' | 'error' | ''>('');

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = () => {
  isDragging.value = false;
};

const processFile = async (file: File) => {
  if (!file.name.endsWith('.xml')) {
    resultType.value = 'error';
    resultMessage.value = 'Por favor, envie apenas arquivos XML.';
    return;
  }

  isProcessing.value = true;
  resultMessage.value = '';
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const xml = e.target?.result as string;
      await importNfe.mutateAsync({ xml });
      resultType.value = 'success';
      resultMessage.value = 'Nota Fiscal importada e lançamentos gerados com sucesso!';
    } catch (err: any) {
      resultType.value = 'error';
      resultMessage.value = err.response?.data?.error || 'Erro ao processar a Nota Fiscal.';
    } finally {
      isProcessing.value = false;
    }
  };
  reader.onerror = () => {
    resultType.value = 'error';
    resultMessage.value = 'Erro ao ler o arquivo.';
    isProcessing.value = false;
  };
  
  reader.readAsText(file);
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  isDragging.value = false;
  
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    processFile(files[0] as File);
  }
};

const onFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    processFile(target.files[0] as File);
  }
};
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title">Importar NF-e</h1>
        <p class="page-subtitle">Arraste arquivos XML de Notas Fiscais para gerar automaticamente lançamentos financeiros e atualizar o estoque.</p>
      </div>
    </div>

    <div class="upload-container glass" 
      @dragover="onDragOver" 
      @dragleave="onDragLeave" 
      @drop="onDrop"
      :class="{ 'is-dragging': isDragging }"
    >
      <div v-if="isProcessing" class="loading-state">
        <div class="spinner mb-4"></div>
        <p class="font-medium text-lg">Processando XML...</p>
        <p class="text-secondary text-sm mt-2">Lendo dados, produtos e tributos da nota.</p>
      </div>
      
      <div v-else class="upload-content">
        <svg class="upload-icon w-16 h-16 mb-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 class="text-xl font-medium mb-2">Arraste e solte o XML aqui</h3>
        <p class="text-secondary mb-6">ou clique no botão abaixo para selecionar do seu computador</p>
        
        <input type="file" id="fileInput" accept=".xml" class="hidden" @change="onFileSelect" />
        <label for="fileInput">
          <Button variant="primary" as="span" class="cursor-pointer">Selecionar Arquivo XML</Button>
        </label>
      </div>
    </div>

    <div v-if="resultMessage && !isProcessing" class="result-message" :class="`result-${resultType}`">
      <div class="flex items-center gap-3">
        <svg v-if="resultType === 'success'" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="font-medium">{{ resultMessage }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-container {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--c-border);
  border-radius: var(--radius-xl);
  transition: all var(--transition-normal);
  margin-top: 1rem;
}

.upload-container.is-dragging {
  border-color: var(--c-primary);
  background: rgba(59, 130, 246, 0.05);
  transform: scale(1.01);
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  pointer-events: none;
}

.upload-content label, .upload-content button, .upload-content input {
  pointer-events: auto;
}

.result-message {
  margin-top: 2rem;
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  animation: fadeIn 0.3s ease-out;
}

.result-success {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.result-error {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

[data-theme='dark'] .result-success {
  color: #4ade80;
}
[data-theme='dark'] .result-error {
  color: #f87171;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hidden {
  display: none;
}
</style>
