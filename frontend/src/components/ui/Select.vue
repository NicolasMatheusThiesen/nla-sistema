<script setup lang="ts">
const props = defineProps({
  modelValue: [String, Number],
  label: String,
  options: {
    type: Array as () => Array<{ value: string | number; label: string }>,
    required: true
  },
  error: String,
  id: String
});

const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div class="input-group">
    <label v-if="label" :for="id" class="input-label">{{ label }}</label>
    <div class="input-wrapper">
      <select 
        :id="id"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        class="input-field select-field"
        :class="{ 'is-invalid': error }"
      >
        <option value="" disabled selected hidden>Selecione...</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <div class="select-arrow">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
    <span v-if="error" class="input-error">{{ error }}</span>
  </div>
</template>

<style scoped>
.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--c-text-primary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-field {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-border);
  background-color: var(--c-surface);
  color: var(--c-text-primary);
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  appearance: none; /* Hide default arrow */
}

.input-field:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px rgba(var(--c-primary), 0.1);
}

.input-field.is-invalid {
  border-color: #ef4444;
}

.input-field.is-invalid:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.select-arrow {
  position: absolute;
  right: 0.75rem;
  pointer-events: none;
  color: var(--c-text-secondary);
}

.select-arrow svg {
  width: 1rem;
  height: 1rem;
}

.input-error {
  font-size: 0.75rem;
  color: #ef4444;
}

[data-theme='dark'] .input-error {
  color: #fca5a5;
}
</style>
