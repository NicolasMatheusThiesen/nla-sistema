

import { useState, useCallback } from 'react';
import { useParseNFe, useImportarNFe, useNFes, useMaquinas, useContratos, useClientes, type NFeParseResult } from '@/hooks/useApi';
import { formatMoney, formatDate } from '@/lib/utils';
import { Button, Skeleton, EmptyState } from '@/components/ui';

function UploadZone({ onFile }: { onFile: (xml: string) => void }) {
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) onFile(e.target.result as string); };
    reader.readAsText(file, 'UTF-8');
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}`}
      onClick={() => document.getElementById('nfe-file-input')?.click()}
    >
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
      </div>
      <p className="font-semibold text-foreground text-lg">Arraste o XML da NF-e aqui</p>
      <p className="text-muted-foreground text-sm mt-1">ou clique para selecionar o arquivo</p>
      <p className="text-xs text-muted-foreground mt-3 bg-muted inline-block px-3 py-1 rounded-full">Suporte: NF-e padrão SEFAZ versão 4.00</p>
      <input id="nfe-file-input" type="file" accept=".xml" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}

export default function NFeImportPage() {
  const [preview, setPreview] = useState<NFeParseResult | null>(null);
  const [xmlRaw, setXmlRaw] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [contratoId, setContratoId] = useState('');
  const [tipoOverride, setTipoOverride] = useState<'entrada' | 'saida' | ''>('');

  const parseMut = useParseNFe();
  const importarMut = useImportarNFe();
  const { data: nfes, isLoading: loadingNfes } = useNFes();
  const { data: clientes } = useClientes();
  const { data: maquinas } = useMaquinas();
  const { data: contratos } = useContratos({ status: 'ativo' });

  const handleXml = async (xml: string) => {
    setXmlRaw(xml);
    setPreview(null);
    const result = await parseMut.mutateAsync(xml);
    setPreview(result);
    if (result.cliente_sugerido) setClienteId(result.cliente_sugerido.id);
    setTipoOverride(result.tipo);
  };

  const handleImportar = async () => {
    if (!preview) return;
    await importarMut.mutateAsync({
      xml: xmlRaw,
      cliente_id: clienteId || undefined,
      maquina_id: maquinaId || undefined,
      contrato_id: contratoId || undefined,
      tipo_override: tipoOverride || undefined,
    });
    setPreview(null);
    setXmlRaw('');
    setClienteId('');
    setMaquinaId('');
    setContratoId('');
  };

  const tipoFinal = tipoOverride || preview?.tipo;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Importar NF-e XML</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Importe notas fiscais eletrônicas e crie lançamentos financeiros automaticamente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna esquerda: upload + preview */}
        <div className="space-y-4">
          {!preview ? (
            <UploadZone onFile={handleXml} />
          ) : (
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Status */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-green-50">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  NF-e lida com sucesso
                </div>
                <button onClick={() => { setPreview(null); setXmlRaw(''); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors">Limpar</button>
              </div>

              <div className="p-5 space-y-3">
                {/* Dados da NF-e */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Nº NF-e', value: preview.numero },
                    { label: 'Data Emissão', value: formatDate(preview.dataEmissao) },
                    { label: 'Emitente', value: preview.emitenteNome },
                    { label: 'CNPJ Emitente', value: preview.emitenteCnpj },
                    { label: 'Destinatário', value: preview.destinatarioNome },
                    { label: 'CNPJ Dest.', value: preview.destinatarioCnpj },
                  ].map(f => (
                    <div key={f.label} className="bg-muted/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-medium text-foreground truncate">{f.value || '—'}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/40 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-foreground">{formatMoney(preview.valorTotal)}</p>
                </div>

                {/* Tipo */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Classificar como:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setTipoOverride('saida')}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${tipoFinal === 'saida' ? 'border-green-500 bg-green-50 text-green-700' : 'border-border text-muted-foreground hover:border-green-300'}`}
                    >
                      📈 Receita (Saída)
                    </button>
                    <button
                      onClick={() => setTipoOverride('entrada')}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${tipoFinal === 'entrada' ? 'border-red-500 bg-red-50 text-red-700' : 'border-border text-muted-foreground hover:border-red-300'}`}
                    >
                      📉 Despesa (Entrada)
                    </button>
                  </div>
                </div>

                {/* Produtos */}
                {preview.produtos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Itens da NF-e</p>
                    <div className="rounded-xl overflow-hidden border border-border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50"><tr><th className="text-left p-2">Produto</th><th className="p-2">Qtd</th><th className="p-2 text-right">Total</th></tr></thead>
                        <tbody>
                          {preview.produtos.map((p, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="p-2 text-foreground">{p.nome}</td>
                              <td className="p-2 text-center text-muted-foreground">{p.qtd}</td>
                              <td className="p-2 text-right font-medium">{formatMoney(p.vlrTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {parseMut.isPending && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              Processando XML...
            </div>
          )}
        </div>

        {/* Coluna direita: vínculos + ação */}
        <div className="space-y-4">
          {preview && (
            <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-foreground">🔗 Vincular aos dados do sistema</h3>

              {preview.cliente_sugerido && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <span className="font-semibold">✨ Cliente sugerido por CNPJ:</span> {preview.cliente_sugerido.razao_social}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground">Cliente</label>
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Nenhum —</option>
                  {(clientes || []).map(c => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Máquina (opcional)</label>
                <select
                  value={maquinaId}
                  onChange={e => setMaquinaId(e.target.value)}
                  className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Nenhuma —</option>
                  {(maquinas || []).map(m => (
                    <option key={m.id} value={m.id}>{m.nome} {m.modelo ? `— ${m.modelo}` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Contrato (opcional)</label>
                <select
                  value={contratoId}
                  onChange={e => setContratoId(e.target.value)}
                  className="mt-1.5 flex h-9 w-full rounded-lg border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Nenhum —</option>
                  {(contratos || []).map(c => (
                    <option key={c.id} value={c.id}>{c.numero} — {c.clientes?.razao_social}</option>
                  ))}
                </select>
              </div>

              {/* Resumo do que será criado */}
              <div className={`rounded-xl p-4 border ${tipoFinal === 'saida' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-sm font-semibold ${tipoFinal === 'saida' ? 'text-green-800' : 'text-red-800'}`}>
                  {tipoFinal === 'saida' ? '📈 Será criado um lançamento de RECEITA' : '📉 Será criado um lançamento de DESPESA'}
                </p>
                <p className={`text-xs mt-1 ${tipoFinal === 'saida' ? 'text-green-700' : 'text-red-700'}`}>
                  Valor: {formatMoney(preview.valorTotal)} • Data: {formatDate(preview.dataEmissao)}
                </p>
              </div>

              <Button
                className="w-full"
                loading={importarMut.isPending}
                onClick={handleImportar}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Importar NF-e e Criar Lançamento
              </Button>
            </div>
          )}

          {/* Histórico de NF-es */}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Histórico de NF-es Importadas</h3>
            </div>
            {loadingNfes ? (
              <div className="p-4 space-y-2">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : !nfes?.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma NF-e importada ainda</div>
            ) : (
              <div className="divide-y divide-border">
                {nfes.slice(0, 10).map(nfe => (
                  <div key={nfe.id} className="px-5 py-3 flex items-center justify-between hover:bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">NF-e nº{nfe.numero}</p>
                      <p className="text-xs text-muted-foreground">{nfe.emitente_nome} • {formatDate(nfe.data_emissao)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${nfe.tipo === 'saida' ? 'text-green-600' : 'text-red-600'}`}>
                        {nfe.tipo === 'saida' ? '+' : '-'}{formatMoney(nfe.valor_total)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${nfe.tipo === 'saida' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {nfe.tipo === 'saida' ? 'receita' : 'despesa'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
