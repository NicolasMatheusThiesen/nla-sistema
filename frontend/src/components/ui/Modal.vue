<script setup lang="ts">
const props = defineProps({
  open: Boolean,
  title: String,
  size: { type: String, default: 'md' } // sm, md, lg, xl
});

const emit = defineEmits(['close']);
</script>

<template>
  <div v-if="open" class="modal-backdrop" @click="emit('close')">
    <div class="modal-content" :class="`modal-${size}`" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close" @click="emit('close')">×</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fadeIn var(--transition-fast);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp var(--transition-fast);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.modal-sm { max-width: 400px; }
.modal-md { max-width: 500px; }
.modal-lg { max-width: 800px; }
.modal-xl { max-width: 1024px; }

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.modal-close {
  font-size: 1.5rem;
  color: var(--c-text-secondary);
  line-height: 1;
  padding: 0.25rem;
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--c-text-primary);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}
</style>
