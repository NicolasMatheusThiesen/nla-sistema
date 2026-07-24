import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProfiles() {
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;

  const empresaId = 'a0000000-0000-0000-0000-000000000001';

  for (const user of users.users) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (!profile) {
      console.log(`Criando perfil para ${user.email}...`);
      await supabase.from('profiles').insert({
        user_id: user.id,
        empresa_id: empresaId,
        nome: user.email.split('@')[0],
        email: user.email,
        role: 'admin',
        ativo: true
      });
      console.log('Perfil criado com sucesso!');
    }
  }
}

syncProfiles().catch(console.error);