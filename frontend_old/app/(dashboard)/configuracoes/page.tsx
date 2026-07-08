'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Modal } from '@/components/ui';
import { useForm } from 'react-hook-form';

interface Categoria {
  id: string; nome: string; tipo: string; cor: string;
}

function useCategoriasQuery() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => api.get<Categoria[]>('/api/categorias'),
  });
}

function EditCategoriaForm({ categoria, onClose, updateMut }: { categoria: Categoria; onClose: () => void; updateMut: any }) {
  const { register, handleSubmit } = useForm<any>({
    defaultValues: { nome: categoria.nome, tipo: categoria.tipo, cor: categoria.cor },
  });

  const onSubmit = async (data: any) => {
    try {
      await updateMut.mutateAsync({ id: categoria.id, data });
      onClose();
    } catch {
      // O hook ja exibe o toast de erro; manter o modal aberto evita perda dos dados digitados.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Nome" {...register('nome', { required: true })} />
      <Select label="Tipo" options={[{ value: 'receita', label: 'Receita' }, { value: 'despesa', label: 'Despesa' }]} {...register('tipo')} />
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Cor</label>
        <input type="color" {...register('cor')} className="h-9 w-16 rounded-lg border border-input cursor-pointer block" />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" loading={updateMut.isPending}>Salvar</Button>
      </div>
    </form>
  );
}

function CategoriasTab() {
  const { data: categorias } = useCategoriasQuery();
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<any>({ defaultValues: { nome: '', tipo: 'despesa', cor: '#3b82f6' } });
  const [editCategoria, setEditCategoria] = useState<Categoria | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/categorias/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria removida'); },
    onError: () => toast.error('Erro ao remover'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/api/categorias/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria atualizada!'); },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });

  const createMut = useMutation({
    mutationFn: (data: { nome: string; tipo: string; cor: string }) => api.post('/api/categorias', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria criada!'); },
    onError: () => toast.error('Erro ao criar categoria'),
  });


  const onSubmit = async (data: any) => {
    try {
      if (editCategoria) {
        await updateMut.mutateAsync({ id: editCategoria.id, data });
        setEditCategoria(null);
      } else {
        await createMut.mutateAsync(data);
      }
      reset({ nome: '', tipo: 'despesa', cor: '#3b82f6' });
    } catch {
      // O hook ja exibe o toast de erro; manter o formulario preenchido evita perda dos dados digitados.
    }
  };

  const startEdit = (c: Categoria) => {
    setEditCategoria(c);
    reset({ nome: c.nome, tipo: c.tipo, cor: c.cor });
  };

  const cancelEdit = () => {
    setEditCategoria(null);
    reset({ nome: '', tipo: 'despesa', cor: '#3b82f6' });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Nova Categoria</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-40">
              <Input label="Nome" {...register('nome', { required: true })} placeholder="Ex: Manutenção" />
            </div>
            <Select label="Tipo" options={[{ value: 'receita', label: 'Receita' }, { value: 'despesa', label: 'Despesa' }]} {...register('tipo')} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Cor</label>
              <input type="color" {...register('cor')} className="h-9 w-16 rounded-lg border border-input cursor-pointer block" />
            </div>
            <div className="flex gap-2">
              {editCategoria && <Button type="button" variant="outline" onClick={cancelEdit}>Cancelar</Button>}
              <Button type="submit" loading={createMut.isPending || updateMut.isPending}>{editCategoria ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['receita', 'despesa'] as const).map(tipo => (
          <Card key={tipo}>
            <CardHeader>
              <CardTitle>{tipo === 'receita' ? '↑ Receitas' : '↓ Despesas'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {(categorias || []).filter(c => c.tipo === tipo).map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/40 group transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.cor }} />
                      <span className="text-sm font-medium">{c.nome}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMut.mutate(c.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remover"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {(categorias || []).filter(c => c.tipo === tipo).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editCategoria && (
        <Modal open={!!editCategoria} onClose={() => setEditCategoria(null)} title="Editar Categoria">
          <EditCategoriaForm categoria={editCategoria} onClose={() => setEditCategoria(null)} updateMut={updateMut} />
        </Modal>
      )}
    </div>
  );
}

function PerfilTab() {
  const { profile } = useAuth();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const alterarSenha = async () => {
    if (novaSenha !== confirmSenha) { toast.error('As senhas não coincidem'); return; }
    if (novaSenha.length < 6) { toast.error('Senha deve ter ao menos 6 caracteres'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) toast.error(error.message);
    else { toast.success('Senha alterada!'); setNovaSenha(''); setConfirmSenha(''); }
    setLoading(false);
  };

  const roleLabel: Record<string, string> = { admin: 'Administrador', financeiro: 'Financeiro', operacional: 'Operacional' };
  const roleColor: Record<string, string> = { admin: 'bg-purple-100 text-purple-700', financeiro: 'bg-blue-100 text-blue-700', operacional: 'bg-green-100 text-green-700' };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Meu Perfil</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-5 mb-6 p-4 bg-muted/30 rounded-xl">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/25">
              {profile?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="text-lg font-bold">{profile?.nome}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium mt-1.5 inline-block ${roleColor[profile?.role || ''] || 'bg-gray-100 text-gray-700'}`}>
                {roleLabel[profile?.role || ''] || profile?.role}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Alterar Senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input
              label="Nova Senha"
              type={showPass ? 'text' : 'password'}
              value={novaSenha}
              onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <Input
            label="Confirmar Nova Senha"
            type={showPass ? 'text' : 'password'}
            value={confirmSenha}
            onChange={e => setConfirmSenha(e.target.value)}
            placeholder="Repita a nova senha"
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} className="accent-primary" />
              Mostrar senha
            </label>
          </div>
          <Button onClick={alterarSenha} loading={loading}>Alterar Senha</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EmpresaTab() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  return (
    <Card>
      <CardHeader><CardTitle>Dados da Empresa</CardTitle></CardHeader>
      <CardContent>
        {!isAdmin ? (
          <p className="text-sm text-muted-foreground">Apenas administradores podem alterar os dados da empresa.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Para editar os dados da empresa, acesse diretamente o painel do Supabase:
            </p>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
              <p className="text-sm font-medium text-blue-800">Como editar:</p>
              <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Acesse <strong>supabase.com</strong> → seu projeto</li>
                <li>Vá em <strong>Table Editor</strong> → tabela <code className="font-mono bg-blue-100 px-1 rounded">empresa</code></li>
                <li>Edite a linha com os dados da sua empresa</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'perfil' | 'categorias' | 'empresa'>('perfil');

  const tabs = [
    { key: 'perfil' as const, label: 'Meu Perfil' },
    { key: 'categorias' as const, label: 'Categorias Financeiras' },
    { key: 'empresa' as const, label: 'Dados da Empresa' },
  ];

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && <PerfilTab />}
      {activeTab === 'categorias' && <CategoriasTab />}
      {activeTab === 'empresa' && <EmpresaTab />}
    </div>
  );
}
