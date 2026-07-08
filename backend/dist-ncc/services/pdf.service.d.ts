export declare function generateFluxoCaixaPDF(dados: {
    empresa: {
        razao_social?: string;
        cnpj?: string;
    } | null;
    periodo: {
        inicio: string;
        fim: string;
    };
    parcelas: Array<Record<string, unknown>>;
    lancamentos: Array<Record<string, unknown>>;
    totais: {
        receitas: number;
        despesas: number;
        inadimplencia: number;
    };
}): Promise<Buffer>;
export declare function generateRentabilidadePDF(dados: {
    empresa: {
        razao_social?: string;
        cnpj?: string;
    } | null;
    periodo_meses: number;
    maquinas: Array<Record<string, unknown>>;
}): Promise<Buffer>;
export declare function generateInadimplenciaPDF(dados: {
    empresa: {
        razao_social?: string;
        cnpj?: string;
    } | null;
    total_inadimplencia: number;
    clientes_inadimplentes: Array<{
        cliente: unknown;
        parcelas: unknown[];
        total: number;
    }>;
}): Promise<Buffer>;
//# sourceMappingURL=pdf.service.d.ts.map