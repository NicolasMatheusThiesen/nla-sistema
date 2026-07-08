<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps({
  variant: {
    type: String,
    default: 'primary', // primary, secondary, outline, ghost
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg
  },
  type: {
    type: String as () => 'button' | 'submit' | 'reset',
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  }
});
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="btn"
    :class="[`btn-${variant}`, `btn-${size}`, { 'btn-block': block }]"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-family: inherit;
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Sizes */
.btn-sm { padding: 0.375rem 0.75rem; font-size: 0.75rem; }
.btn-md { padding: 0.5rem 1rem; font-size: 0.875rem; }
.btn-lg { padding: 0.75rem 1.5rem; font-size: 1rem; }
.btn-block { width: 100%; }

/* Variants */
.btn-primary {
  background-color: var(--c-primary);
  color: #000;
  border: 1px solid var(--c-primary);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--c-primary-hover);
}

.btn-outline {
  background-color: transparent;
  color: var(--c-text-primary);
  border: 1px solid var(--c-border);
}
.btn-outline:hover:not(:disabled) {
  background-color: var(--c-bg);
}

.btn-ghost {
  background-color: transparent;
  color: var(--c-text-primary);
  border: 1px solid transparent;
}
.btn-ghost:hover:not(:disabled) {
  background-color: rgba(100, 116, 139, 0.1);
}
</style>
