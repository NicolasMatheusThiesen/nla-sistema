<script setup lang="ts">
const props = defineProps({
  modelValue: [String, Number],
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  error: String,
  id: String
});

const emit = defineEmits(['update:modelValue', 'blur']);

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLInputElement).value);
};
</script>

<template>
  <div class="input-wrapper">
    <label v-if="label" :for="id" class="input-label">{{ label }}</label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput"
      @blur="emit('blur', $event)"
      class="input-field"
      :class="{ 'has-error': !!error }"
    />
    <span v-if="error" class="error-msg">{{ error }}</span>
  </div>
</template>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.input-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--c-text-primary);
}

.input-field {
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--c-text-primary);
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.input-field:focus {
  outline: none;
  border-color: var(--c-primary);
  box-shadow: 0 0 0 2px rgba(var(--c-primary), 0.2);
}

.input-field.has-error {
  border-color: var(--c-danger);
}

.error-msg {
  font-size: 0.75rem;
  color: var(--c-danger);
}
</style>
