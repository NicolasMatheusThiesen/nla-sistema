<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, authService } from '@/lib/api';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');
const router = useRouter();

const handleLogin = async () => {
  if (!email.value || !password.value) {
    errorMsg.value = 'Preencha todos os campos.';
    return;
  }
  
  loading.value = true;
  errorMsg.value = '';
  
  try {
    const data = await api.post<{ session: any; user: any }>('/api/auth/login', {
      email: email.value,
      password: password.value,
    });
    
    if (data.session) {
      authService.setSession(data.session, data.user);
      router.push('/');
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Erro ao fazer login. Verifique suas credenciais.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-layout">
    <!-- Esquerda: Imagem/Apresentação -->
    <div class="presentation-side">
      <div class="presentation-content">
        <div class="logo-box">
          <svg class="logo-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 class="presentation-title">Gestão Inteligente <br> para Locações</h1>
        <p class="presentation-subtitle">Controle suas máquinas, contratos, financeiro e clientes em uma única plataforma feita para o seu negócio.</p>
        
        <div class="features-list">
          <div class="feature-item">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Dashboard completo
          </div>
          <div class="feature-item">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Gestão Financeira Descomplicada
          </div>
          <div class="feature-item">
            <svg class="feature-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            Acompanhamento de Máquinas
          </div>
        </div>
      </div>
    </div>

    <!-- Direita: Formulário de Login -->
    <div class="login-side">
      <div class="login-wrapper">
        <div class="login-header">
          <h2 class="login-title">Bem-vindo de volta!</h2>
          <p class="login-subtitle">Insira suas credenciais para acessar sua conta</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <Input 
            v-model="email" 
            label="E-mail" 
            type="email" 
            placeholder="seu@email.com" 
            required 
          />
          
          <Input 
            v-model="password" 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            required 
          />
          
          <div v-if="errorMsg" class="error-msg">
            <svg class="error-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ errorMsg }}
          </div>

          <Button variant="primary" type="submit" class="submit-btn" :disabled="loading">
            <svg v-if="loading" class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? 'Entrando...' : 'Entrar no Sistema' }}
          </Button>
        </form>
        
        <div class="login-footer">
          Problemas para acessar? <a href="#" class="support-link">Contate o suporte</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-layout {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: var(--c-bg);
}

.presentation-side {
  display: none;
  position: relative;
  width: 50%;
  background: linear-gradient(135deg, var(--c-primary-light) 0%, var(--c-primary) 100%);
  overflow: hidden;
  padding: 4rem;
}

/* Bolhas de fundo para um efeito dinâmico */
.presentation-side::before {
  content: '';
  position: absolute;
  top: -10%;
  left: -10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}

.presentation-side::after {
  content: '';
  position: absolute;
  bottom: -20%;
  right: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
}

.presentation-content {
  position: relative;
  z-index: 10;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.logo-box {
  background: rgba(255, 255, 255, 0.4);
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

.logo-icon {
  width: 3rem;
  height: 3rem;
  color: #1a1a1a;
}

.presentation-title {
  font-size: 2.5rem;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 1rem;
  line-height: 1.2;
}

.presentation-subtitle {
  color: #333333;
  font-size: 1.125rem;
  max-width: 400px;
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  color: #1a1a1a;
  font-weight: 500;
}

.feature-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.75rem;
  color: #16a34a;
}

.login-side {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
}

.login-wrapper {
  width: 100%;
  max-width: 420px;
  padding: 3rem;
  background: var(--c-surface);
  border-radius: 24px;
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--c-border);
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--c-text-primary);
  margin-bottom: 0.5rem;
}

.login-subtitle {
  color: var(--c-text-secondary);
  font-size: 0.95rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.error-msg {
  padding: 0.75rem;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--c-danger);
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  display: flex;
  align-items: center;
}

.error-icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  margin-top: 0.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--c-primary), 0.3);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.login-footer {
  margin-top: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--c-text-secondary);
}

.support-link {
  font-weight: 600;
  color: var(--c-primary);
  transition: color 0.2s;
}

.support-link:hover {
  color: var(--c-primary-hover);
}

@media (min-width: 1024px) {
  .presentation-side {
    display: block;
  }
  .login-side {
    width: 50%;
  }
  .login-wrapper {
    box-shadow: none;
    border: none;
    padding: 0;
  }
}
</style>