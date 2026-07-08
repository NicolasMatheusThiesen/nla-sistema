

import { useState } from 'react';
import { useFornecedores, useCreateFornecedor, useUpdateFornecedor, useDeleteFornecedor, type Fornecedor } from '@/hooks/useApi';
import { Button, Modal, Input, Select, Textarea, EmptyState, Skeleton, ConfirmDialog } from '@/components/ui';

function FornecedorModal({ open, onClose, fornecedor }: { open: boolean; onClose: () => void; fornecedor?: Fornecedor }) {
  const [formData, setFormData] = useState<Partial<Fornecedor>>(
    fornecedor ? { ...fornecedor } : { tipo_pessoa: 'PJ', ativo: true }
  );
  
  const createMut = useCreateFornecedor();
  const updateMut = useUpdateFornecedor(fornecedor?.id || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (payload.tipo_pessoa === 'PF') {
        delete payload.nome_fantasia;
      }
      
      if (fornecedor?.id) {
        await updateMut.mutateAsync(payload);
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={fornecedor ? 'Editar Fornecedor' : 'Novo Fornecedor'} size="lg">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Tipo de Pessoa*</label>
            <select name="tipo_pessoa" value={formData.tipo_pessoa || 'PJ'} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="PJ">Pessoa Jurídica</option>
              <option value="PF">Pessoa Física</option>
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{formData.tipo_pessoa === 'PJ' ? 'CNPJ*' : 'CPF*'}</label>
            <input required type="text" name="cpf_cnpj" value={formData.cpf_cnpj || ''} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          
          <div className="space-y-1.5 col-span-2">
            <label className="text-sm font-medium text-foreground">Razão Social / Nome*</label>
            <input required type="text" name="razao_social" value={formData.razao_social || ''} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          
          {formData.tipo_pessoa === 'PJ' && (
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium text-foreground">Nome Fantasia</label>
              <input type="text" name="nome_fantasia" value={formData.nome_fantasia || ''} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Telefone</label>
            <input type="text" name="telefone" value={formData.telefone || ''} onChange={handleChange} className="flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        
        <div className="flex gap-3 justify-end pt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
            {fornecedor ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function FornecedoresPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Fornecedor | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: fornecedores, isLoading } = useFornecedores({ ...(search && { search }) });
  const deleteMut = useDeleteFornecedor();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-foreground">Fornecedores</h1>
        <div className="flex gap-3 w-full sm:w-auto">
          <Input 
            placeholder="Buscar por nome ou CNPJ..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="w-full sm:w-64"
          />
          <Button onClick={() => { setEditItem(undefined); setModalOpen(true); }}>Novo Fornecedor</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome / Razão Social</th>
                <th className="px-4 py-3 font-medium">CNPJ / CPF</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Localidade</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-6 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : fornecedores?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </td>
                </tr>
              ) : (
                fornecedores?.map(f => (
                  <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{f.razao_social}</p>
                      {f.nome_fantasia && <p className="text-xs text-muted-foreground">{f.nome_fantasia}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{f.cpf_cnpj}</td>
                    <td className="px-4 py-3 text-xs">
                      {f.telefone && <p>{f.telefone}</p>}
                      {f.email && <p className="text-muted-foreground">{f.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {f.cidade ? `${f.cidade} - ${f.estado}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setEditItem(f); setModalOpen(true); }}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setDeleteId(f.id)}>Remover</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && <FornecedorModal open={modalOpen} onClose={() => setModalOpen(false)} fornecedor={editItem} />}
      
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteMut.mutateAsync(deleteId);
            setDeleteId(null);
          }
        }}
        loading={deleteMut.isPending}
        title="Remover fornecedor?"
        description="Esta ação desativará o fornecedor do sistema."
      />
    </div>
  );
}
