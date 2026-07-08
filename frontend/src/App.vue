<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { RouterView } from 'vue-router';

// Theme management
const theme = ref(localStorage.getItem('theme') || 'dark');

watch(theme, (newTheme) => {
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

onMounted(() => {
  document.documentElement.setAttribute('data-theme', theme.value);
});
</script>

<template>
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style scoped>
</style>
