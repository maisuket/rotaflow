import { ChangeEvent, useState } from "react";
import { useAppState } from "../context/AppState";
import { parseLocationsCsv } from "../utils/csv";

const TEMPLATE_CSV =
  "name,lat,lng,demand,address\n" +
  "Ana,-3.1019,-60.0250,1,\n" +
  "Bruno,,,2,Av. Djalma Batista 100 Manaus\n";

interface ImportResultSummary {
  createdCount: number;
  errors: { row: number; message: string }[];
}

export function LocationImportForm() {
  const { importLocations, loading } = useAppState();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<
    ReturnType<typeof parseLocationsCsv>["rows"]
  >([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImportResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const { rows, error } = parseLocationsCsv(text);
      setParseError(error ?? null);
      setPreviewRows(error ? [] : rows);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;
    setImporting(true);
    const outcome = await importLocations(
      previewRows.map((r) => ({
        name: r.name,
        lat: r.lat,
        lng: r.lng,
        demand: r.demand,
        address: r.address,
      }))
    );
    setImporting(false);
    if (outcome) {
      setImportResult({ createdCount: outcome.created.length, errors: outcome.errors });
      setPreviewRows([]);
      setFileName(null);
    }
  };

  const downloadHref =
    "data:text/csv;charset=utf-8," + encodeURIComponent(TEMPLATE_CSV);

  return (
    <div className="section">
      <div className="section-title">Importar CSV</div>
      <p className="section-hint">
        Colunas aceitas: <strong>name</strong> (obrigatório), <strong>lat</strong> +{" "}
        <strong>lng</strong>, ou <strong>address</strong> (endereço para geocodificar), e{" "}
        <strong>demand</strong> (opcional, padrão 1).
      </p>

      <div className="field">
        <input
          className="input"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
        />
      </div>

      <a
        className="btn btn-ghost btn-sm"
        href={downloadHref}
        download="modelo-localizacoes.csv"
        style={{ display: "inline-block", marginBottom: 10 }}
      >
        Baixar modelo CSV
      </a>

      {parseError && <div className="alert alert-error">{parseError}</div>}

      {previewRows.length > 0 && (
        <>
          <div className="section-hint">
            {fileName}: {previewRows.length} linha(s) prontas para importar.
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={handleImport}
            disabled={importing || loading}
          >
            {importing ? "Importando…" : `Importar ${previewRows.length} localização(ões)`}
          </button>
        </>
      )}

      {importResult && (
        <div
          className={
            importResult.errors.length > 0 ? "alert alert-warning" : "alert alert-success"
          }
          style={{ marginTop: 10 }}
        >
          <div>
            {importResult.createdCount} localização(ões) importada(s) com sucesso.
          </div>
          {importResult.errors.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {importResult.errors.map((err) => (
                <li key={err.row}>
                  Linha {err.row}: {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
