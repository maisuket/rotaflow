/**
 * Parser CSV minimo (RFC4180-ish): virgula como separador, campos entre
 * aspas podem conter virgula/quebra de linha, aspas duplicadas dentro de um
 * campo entre aspas viram uma aspas literal ("" -> "). Sem dependencia
 * externa — o bastante pra planilhas exportadas do Excel/Sheets/Numbers.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

export interface ParsedLocationRow {
  /** 1-based, posicao entre as linhas de dado (sem contar o cabecalho). */
  rowNumber: number;
  name: string;
  lat?: number;
  lng?: number;
  demand?: number;
  address?: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["name", "nome"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "long", "longitude"],
  demand: ["demand", "passageiros", "pax", "demanda"],
  address: ["address", "endereco", "endereço", "rua"],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export interface ParseLocationsCsvResult {
  rows: ParsedLocationRow[];
  error?: string;
}

/** Interpreta um CSV de localizacoes: exige "name" + ("lat"+"lng" OU "address"). */
export function parseLocationsCsv(text: string): ParseLocationsCsvResult {
  const table = parseCsv(text);
  if (table.length === 0) {
    return { rows: [], error: "Arquivo vazio." };
  }

  const header = table[0].map(normalizeHeader);
  const findCol = (key: string): number => header.findIndex((h) => HEADER_ALIASES[key].includes(h));

  const nameIdx = findCol("name");
  const latIdx = findCol("lat");
  const lngIdx = findCol("lng");
  const demandIdx = findCol("demand");
  const addressIdx = findCol("address");

  if (nameIdx === -1) {
    return { rows: [], error: 'Coluna "name" (ou "nome") não encontrada no cabeçalho.' };
  }
  if (latIdx === -1 && addressIdx === -1) {
    return { rows: [], error: 'É preciso ter "lat" + "lng", ou "address", no cabeçalho.' };
  }

  const dataRows = table.slice(1);
  const rows: ParsedLocationRow[] = dataRows.map((cells, i) => {
    const get = (idx: number) => (idx >= 0 ? cells[idx]?.trim() : undefined);
    const latStr = get(latIdx);
    const lngStr = get(lngIdx);
    const demandStr = get(demandIdx);
    return {
      rowNumber: i + 1,
      name: get(nameIdx) ?? "",
      lat: latStr ? Number(latStr) : undefined,
      lng: lngStr ? Number(lngStr) : undefined,
      demand: demandStr ? Number(demandStr) : undefined,
      address: get(addressIdx) || undefined,
    };
  });

  return { rows };
}
