<script setup lang="ts">
import { ref } from 'vue';
import { RouterView } from 'vue-router';
import Sidebar from '@/components/layout/Sidebar.vue';
import Header from '@/components/layout/Header.vue';

const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);

const handleToggleMobileMenu = () => {
  if (sidebarRef.value) {
    sidebarRef.value.toggleMobileMenu();
  }
};
</script>

<template>
  <div class="app-container">
    <Sidebar ref="sidebarRef" />
    <div class="main-content">
      <Header @toggle-mobile-menu="handleToggleMobileMenu" />
      <main class="page-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles if necessary, but app-container and main-content are in main.css */
</style>
