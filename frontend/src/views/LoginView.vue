<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase } from '@/lib/supabase';
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;
    
    if (data.session) {
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
  <div class="login-container">
    <div class="login-box glass">
      <div class="login-header">
        <div class="logo-icon mx-auto mb-4 bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold mb-2">NLA Sistema</h1>
        <p class="text-secondary text-sm">Faça login para acessar o painel</p>
      </div>

      <form @submit.prevent="handleLogin" class="mt-6 flex flex-col gap-4">
        <Input v-model="email" label="E-mail" type="email" placeholder="seu@email.com" required />
        <Input v-model="password" label="Senha" type="password" placeholder="••••••••" required />
        
        <div v-if="errorMsg" class="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {{ errorMsg }}
        </div>
        
        <Button variant="primary" type="submit" class="w-full mt-2" :disabled="loading">
          {{ loading ? 'Entrando...' : 'Entrar' }}
        </Button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  background-image: radial-gradient(circle at 15% 50%, rgba(var(--primary-rgb), 0.08), transparent 25%),
                    radial-gradient(circle at 85% 30%, rgba(var(--primary-rgb), 0.12), transparent 25%);
  padding: 1rem;
}

.login-box {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
}

.login-header {
  text-align: center;
}
</style>