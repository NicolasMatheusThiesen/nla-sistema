'use client';

import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { nome: string; tipo: string; cor: string }) => api.post('/api/categorias', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categorias'] }); toast.success('Categoria criada!'); },
    onError: () => toast.error('Erro ao criar categoria'),
  });
}
