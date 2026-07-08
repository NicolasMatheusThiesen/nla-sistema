import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'NLA Equipamentos — Sistema de Gestão', template: '%s | NLA Equipamentos' },
  description: 'Sistema de gestão para venda e locação de equipamentos industriais',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning translate="no">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(message, source, lineno, colno, error) {
                fetch('http://localhost:3001/api/log-error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'onerror', message, source, lineno, colno, stack: error?.stack })
                }).catch(console.error);
                return false;
              };
              const originalError = console.error;
              console.error = function(...args) {
                fetch('http://localhost:3001/api/log-error', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'console.error', args: args.map(a => (a instanceof Error ? { message: a.message, stack: a.stack } : String(a))) })
                }).catch(console.error);
                originalError.apply(console, args);
              };
            `
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  );
}
