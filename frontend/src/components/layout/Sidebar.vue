<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { authService } from '@/lib/api';

const isMobileMenuOpen = ref(false);
const route = useRoute();
const router = useRouter();

const handleLogout = async () => {
  authService.clearSession();
  router.push('/login');
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// Use exact paths and labels from the legacy system
const navItems = [
  { path: '/', label: 'Dashboard', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>' },
  { path: '/maquinas', label: 'Máquinas', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>' },
  { path: '/clientes', label: 'Clientes', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
  { path: '/contratos', label: 'Contratos', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
  { path: '/financeiro', label: 'Financeiro', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>' },
  { path: '/manutencoes', label: 'Manutenções', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
  { path: '/ordens-servico', label: 'Ordens de Serviço', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>' },
  { path: '/vendas', label: 'Vendas', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>' },
  { path: '/compras', label: 'Compras', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>' },
  { path: '/configuracoes/materiais', label: 'Materiais (Produtos)', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>' },
  { path: '/fornecedores', label: 'Fornecedores', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
  { path: '/configuracoes/servicos', label: 'Serviços', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>' },
  { path: '/configuracoes/tipos-equipamento', label: 'Tipos de Equipamento', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>' },
  { path: '/relatorios', label: 'Relatórios', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
  { path: '/documentos', label: 'Documentos', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>' },
  { path: '/vendedores', label: 'Vendedores', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>' },
  { path: '/contas-bancarias', label: 'Contas Banc�rias', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>' },
    { path: '/financeiro/nfe', label: 'Importar NF-e', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>' },
  { path: '/configuracoes', label: 'Configurações', icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>' },
];

defineExpose({ toggleMobileMenu });
</script>

<template>
  <aside :class="['sidebar', { 'is-mobile-open': isMobileMenuOpen }]">
    <div class="sidebar-header">
      <div class="logo-box">
        <div class="logo-icon">
          <svg class="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div class="logo-text">
          <h2>NLA Equipamentos</h2>
          <p>Gestão de Equipamentos</p>
        </div>
      </div>
      <button class="mobile-close" @click="toggleMobileMenu">×</button>
    </div>
    
    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <RouterLink 
            :to="item.path" 
            class="nav-link" 
            :class="{ active: route.path === item.path }"
          >
            <span class="nav-icon" v-html="item.icon"></span>
            <span class="nav-label">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <!-- User Profile Section -->
    <div class="sidebar-footer">
      <div class="user-card">
        <div class="user-avatar">AD</div>
        <div class="user-info">
          <p class="user-name">Administrador</p>
          <p class="user-role">admin</p>
        </div>
        <button class="logout-btn" title="Sair" @click="handleLogout">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Mobile Overlay -->
  <div v-if="isMobileMenuOpen" class="mobile-overlay" @click="toggleMobileMenu"></div>
</template>

<style scoped>
.sidebar {
  width: 280px;
  background-color: var(--c-surface);
  border-right: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: transform var(--transition-normal);
  z-index: 50;
}

.sidebar-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-box {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  background-color: var(--c-primary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px 0 rgba(var(--c-primary), 0.3);
}

.logo-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  color: #000;
}

.logo-text h2 {
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
}

.logo-text p {
  font-size: 0.75rem;
  color: var(--c-text-secondary);
  margin: 0;
}

.mobile-close {
  display: none;
  font-size: 1.5rem;
  color: var(--c-text-secondary);
}

.sidebar-nav {
  padding: 1rem 0.75rem;
  flex: 1;
  overflow-y: auto;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  color: var(--c-text-secondary);
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.875rem;
  transition: all var(--transition-fast);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

.nav-link:hover {
  background-color: var(--c-bg);
  color: var(--c-text-primary);
}

.nav-link.active {
  background-color: var(--c-primary);
  color: #000;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid var(--c-border);
}

.user-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.user-card:hover {
  background-color: var(--c-bg);
}

.user-avatar {
  width: 2rem;
  height: 2rem;
  background-color: var(--c-primary);
  color: #000;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--c-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.75rem;
  color: var(--c-text-secondary);
  text-transform: capitalize;
}

.logout-btn {
  padding: 0.25rem;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.logout-btn:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--c-danger);
}

.logout-btn svg {
  width: 1.25rem;
  height: 1.25rem;
}

.mobile-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background-color: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 40;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
  }
  
  .sidebar.is-mobile-open {
    transform: translateX(0);
  }

  .mobile-close {
    display: block;
  }

  .mobile-overlay {
    display: block;
  }
}
</style>
