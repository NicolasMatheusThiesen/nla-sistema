const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zmssmbvvfpegpolplfjm.supabase.co';
const supabaseKey = 'sb_secret_QKdq7pWrWt-MHMqVwNN2-w_bH7ONlgc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log('Criando usuário administrador...');
  
  // 1. Criar usuário no auth.users
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'admin@nla.com.br',
    password: 'admin',
    email_confirm: true
  });

  if (authError) {
    if (authError.message.includes('A user with this email address has already been registered') || authError.message.includes('User already registered')) {
        console.log('O e-mail admin@nla.com.br já está cadastrado no Supabase Auth. Atualizando a senha para admin123...');
        // Precisamos buscar o ID dele
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
        if (usersData) {
            const existingUser = usersData.users.find(u => u.email === 'admin@nla.com.br');
            if (existingUser) {
                await supabase.auth.admin.updateUserById(existingUser.id, { password: 'admin123' });
                console.log('Senha atualizada com sucesso para admin123!');
                await setupProfile(existingUser.id);
            }
        }
        return;
    }
    console.error('Erro ao criar usuário:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('Usuário criado com sucesso. ID:', userId);

  await setupProfile(userId);
}

async function setupProfile(userId) {
  // 2. Buscar ID da empresa seed
  const { data: empresaData, error: empresaError } = await supabase
    .from('empresa')
    .select('id')
    .limit(1)
    .single();

  if (empresaError || !empresaData) {
    console.error('Erro ao buscar empresa (você rodou o 003_seed.sql?):', empresaError);
    return;
  }

  const empresaId = empresaData.id;

  // 3. Inserir no profiles
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: userId,
      empresa_id: empresaId,
      nome: 'Administrador NLA',
      email: 'admin@nla.com.br',
      role: 'admin',
      ativo: true
    }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('Erro ao criar profile:', profileError);
    return;
  }

  console.log('Profile criado com sucesso e vinculado à empresa!');
  console.log('--------------------------------------------------');
  console.log('✅ LOGIN PRONTO PARA USO');
  console.log('E-mail: admin@nla.com.br');
  console.log('Senha: admin');
  console.log('--------------------------------------------------');
}

createAdmin();
