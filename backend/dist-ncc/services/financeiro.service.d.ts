export declare function calculateComissao({ tipoComissao, valorMensal, percentualComissao, valorComissao, }?: {
    tipoComissao?: 'percentual' | 'fixo';
    valorMensal?: number;
    percentualComissao?: number;
    valorComissao?: number;
}): number;
export declare function buildContratoLancamentos({ contratoNumero, empresaId, clienteId, contratoId, valorMensal, valorComissao, dataInicio, }: {
    contratoNumero: string;
    empresaId: string;
    clienteId: string;
    contratoId: string;
    valorMensal: number;
    valorComissao: number;
    dataInicio: string;
}): {
    tipo: string;
    descricao: string;
    valor: number;
    empresa_id: string;
    contrato_id: string;
    cliente_id: string;
    data_competencia: string;
    data_vencimento: string;
    status: string;
    observacoes: string;
    recorrente: boolean;
}[];
//# sourceMappingURL=financeiro.service.d.ts.map