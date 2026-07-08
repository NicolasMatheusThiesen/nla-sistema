export declare function generateFluxoCaixaExcel(dados: {
    empresa: {
        razao_social?: string;
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
export declare function generateRentabilidadeExcel(dados: {
    empresa: {
        razao_social?: string;
    } | null;
    periodo_meses: number;
    maquinas: Array<Record<string, unknown>>;
}): Promise<Buffer>;
//# sourceMappingURL=excel.service.d.ts.map