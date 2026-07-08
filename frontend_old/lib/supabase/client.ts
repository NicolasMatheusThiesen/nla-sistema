import { createBrowserClient } from '@supabase/ssr';

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return false;
  if (key.startsWith('sb_secret_')) return false;
  if (key.includes('sua_anon_key') || key.includes('your-anon') || key.includes('demo-anon')) return false;

  return true;
}

function createMockClient() {
  const demoEmail = 'admin@nla.com.br';
  const demoPassword = 'admin';

  const readStoredSession = () => {
    if (typeof window === 'undefined') return null;

    try {
      const raw = window.localStorage.getItem('mock-supabase-session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const writeStoredSession = (session: unknown) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mock-supabase-session', JSON.stringify(session));
    }
  };

  const clearStoredSession = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mock-supabase-session');
    }
  };

  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (email === demoEmail && password === demoPassword) {
          const session = {
            access_token: 'demo-access-token',
            user: { id: 'mock-user-id', email },
          };

          writeStoredSession(session);
          return { data: { session, user: session.user }, error: null };
        }

        clearStoredSession();
        return {
          data: { session: null, user: null },
          error: { message: 'Invalid login credentials' },
        };
      },
      async signOut() {
        clearStoredSession();
        return { error: null };
      },
      async getSession() {
        return { data: { session: readStoredSession() } };
      },
      onAuthStateChange(callback: (event: string) => void) {
        const session = readStoredSession();
        if (session) callback('SIGNED_IN');
        return {
          data: {
            subscription: {
              unsubscribe: () => undefined,
            },
          },
        };
      },
      async updateUser({ password }: { password: string }) {
        if (typeof window !== 'undefined') {
          const currentSession = readStoredSession();
          if (currentSession) {
            const updatedSession = { ...currentSession, password };
            writeStoredSession(updatedSession);
          }
        }

        return { data: { user: { id: 'mock-user-id' } }, error: null };
      },
    },
  };
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return createMockClient() as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
