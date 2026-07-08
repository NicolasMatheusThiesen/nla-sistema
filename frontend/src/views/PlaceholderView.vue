<script setup lang="ts">
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const route = useRoute();
const routeName = computed(() => {
  const path = route.path.replace('/', '');
  if (!path) return '';
  // Capitalize first letter and replace dashes with spaces
  return path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
});
</script>

<template>
  <div class="placeholder-page">
    <div class="empty-state glass">
      <div class="icon-wrapper">
        <svg class="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 class="title">Módulo: {{ routeName }}</h2>
      <p class="subtitle">Esta tela está na fila de migração para o novo padrão Premium.</p>
      
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <p class="status">Em breve...</p>
    </div>
  </div>
</template>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  animation: fadeIn var(--transition-normal);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 4rem 2rem;
  border-radius: var(--radius-xl);
  max-width: 500px;
  width: 100%;
}

.icon-wrapper {
  width: 80px;
  height: 80px;
  background-color: rgba(var(--c-primary), 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--c-text-secondary);
  margin-bottom: 2rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: var(--c-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  width: 30%;
  height: 100%;
  background-color: var(--c-primary);
  border-radius: var(--radius-full);
  animation: indeterminate 2s infinite linear;
  transform-origin: 0% 50%;
}

@keyframes indeterminate {
  0% { transform: translateX(0) scaleX(0); }
  40% { transform: translateX(0) scaleX(0.4); }
  100% { transform: translateX(100%) scaleX(0.5); }
}

.status {
  font-size: 0.75rem;
  color: var(--c-text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
