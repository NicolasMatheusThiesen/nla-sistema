'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface UserProfile {
  id: string;
  user_id: string;
  empresa_id: string;
  nome: string;
  email: string;
  role: 'admin' | 'financeiro' | 'operacional';
  ativo: boolean;
}

export function useAuth() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setProfile({
          id: session.user.id || 'mock-id',
          user_id: session.user.id || 'mock-user-id',
          empresa_id: 'mock-empresa-id',
          nome: session.user.email || 'Admin (Modo Teste)',
          email: session.user.email || 'admin@nla.com',
          role: 'admin',
          ativo: true,
        });
        setLoading(false);
        return;
      }

      setLoading(false);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        router.push('/login');
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        router.push('/login');
      }

      if (event === 'SIGNED_IN') {
        getUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const canAccess = (roles: string[]) => profile ? roles.includes(profile.role) : false;

  return { profile, loading, signOut, canAccess };
}
