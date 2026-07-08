<script setup lang="ts">
import { inject } from 'vue';
import { useTheme } from '@/composables/useTheme';

const { isDark, toggleTheme } = useTheme();

// A placeholder for toggle mobile menu from parent layout
const emit = defineEmits(['toggle-mobile-menu']);
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="mobile-menu-btn" @click="emit('toggle-mobile-menu')">
        ☰
      </button>
      <h1 class="page-title">
        <!-- Page title can be dynamic based on route later -->
        Visão Geral
      </h1>
    </div>
    
    <div class="header-right">
      <button class="theme-toggle" @click="toggleTheme" title="Alternar Tema">
        <span v-if="isDark">☀️</span>
        <span v-else>🌙</span>
      </button>
      
      <div class="user-profile">
        <div class="avatar">US</div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.header {
  height: 72px;
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  z-index: 10;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.mobile-menu-btn {
  display: none;
  font-size: 1.5rem;
  color: var(--c-text-primary);
  padding: 0.5rem;
  margin-left: -0.5rem;
  border-radius: var(--radius-sm);
}

.page-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.theme-toggle {
  font-size: 1.25rem;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-bg);
  border: 1px solid var(--c-border);
  transition: all var(--transition-fast);
}

.theme-toggle:hover {
  background-color: var(--c-border);
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background-color: var(--c-primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }
  .header {
    padding: 0 1rem;
  }
}
</style>
