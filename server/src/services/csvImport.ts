export interface ImportRow {
  name: string;
  lat?: number;
  lng?: number;
  demand?: number;
  /** Alternativa a lat/lng — resolvida via geocodificacao se as coordenadas nao vierem prontas. */
  address?: string;
}

export interface ImportError {
  /** 1-based, referente a posicao da linha DENTRO do array enviado (o frontend mapeia pra linha do arquivo). */
  row: number;
  message: string;
}

export interface ResolvedLocationInput {
  name: string;
  lat: number;
  lng: number;
  demand: number;
}

export interface ResolveImportRowsResult {
  toCreate: ResolvedLocationInput[];
  errors: ImportError[];
}

function isValidLat(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v) && v >= -90 && v <= 90;
}
function isValidLng(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v) && v >= -180 && v <= 180;
}

/**
 * Valida e resolve uma lista de linhas de importacao em localizacoes prontas
 * pra criar. Funcao pura (recebe `geocode` injetado) — nao toca no banco nem
 * no cliente real do Google, entao e totalmente testavel sem rede.
 *
 * Uma linha invalida (nome ausente, coordenadas invalidas, endereco nao
 * encontrado) vira um erro reportado, mas NAO interrompe as demais linhas —
 * o resto do arquivo continua sendo processado normalmente.
 */
export async function resolveImportRows(
  rows: ImportRow[],
  geocode: (address: string) => Promise<{ lat: number; lng: number } | null>
): Promise<ResolveImportRowsResult> {
  const toCreate: ResolvedLocationInput[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const name = row.name?.trim();

    if (!name) {
      errors.push({ row: rowNumber, message: "Nome ausente" });
      continue;
    }

    const demand =
      row.demand !== undefined && Number.isFinite(row.demand) && row.demand >= 1
        ? Math.round(row.demand)
        : 1;

    let lat = row.lat;
    let lng = row.lng;

    if (!isValidLat(lat) || !isValidLng(lng)) {
      if (!row.address || row.address.trim().length === 0) {
        errors.push({ row: rowNumber, message: "Sem coordenadas validas nem endereco" });
        continue;
      }
      try {
        const geocoded = await geocode(row.address.trim());
        if (!geocoded) {
          errors.push({ row: rowNumber, message: `Endereco nao encontrado: "${row.address}"` });
          continue;
        }
        lat = geocoded.lat;
        lng = geocoded.lng;
      } catch (err) {
        errors.push({
          row: rowNumber,
          message: `Erro ao buscar endereco: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    toCreate.push({ name, lat: lat as number, lng: lng as number, demand });
  }

  return { toCreate, errors };
}
