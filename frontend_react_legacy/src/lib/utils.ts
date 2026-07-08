import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('pt-BR');
}

export function formatCPFCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11)
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    disponivel: 'badge-green',
    locada: 'badge-blue',
    manutencao: 'badge-yellow',
    vendida: 'badge-gray',
    ativo: 'badge-green',
    suspenso: 'badge-yellow',
    encerrado: 'badge-gray',
    rascunho: 'badge-purple',
    pago: 'badge-green',
    pendente: 'badge-yellow',
    vencido: 'badge-red',
    cancelado: 'badge-gray',
    bom: 'badge-green',
    regular: 'badge-yellow',
    bloqueado: 'badge-red',
    concluida: 'badge-green',
    em_andamento: 'badge-blue',
    agendada: 'badge-purple',
  };
  return map[status] || 'badge-gray';
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    disponivel: 'Disponível',
    locada: 'Locada',
    manutencao: 'Manutenção',
    vendida: 'Vendida',
    ativo: 'Ativo',
    suspenso: 'Suspenso',
    encerrado: 'Encerrado',
    rascunho: 'Rascunho',
    pago: 'Pago',
    pendente: 'Pendente',
    vencido: 'Vencido',
    cancelado: 'Cancelado',
    bom: 'Bom',
    regular: 'Regular',
    bloqueado: 'Bloqueado',
    concluida: 'Concluída',
    em_andamento: 'Em Andamento',
    agendada: 'Agendada',
    empilhadeira: 'Empilhadeira',
    paleteira: 'Paleteira',
    outro: 'Outro',
    eletrica: 'Elétrica',
    glp: 'GLP',
    diesel: 'Diesel',
    manual: 'Manual',
    preventiva: 'Preventiva',
    corretiva: 'Corretiva',
    reforma: 'Reforma',
  };
  return map[status] || status;
}

export function truncate(str: string, max: number): string {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
