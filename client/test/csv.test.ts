import { describe, expect, it } from "vitest";
import { parseCsv, parseLocationsCsv } from "../src/utils/csv";

describe("parseCsv", () => {
  it("parseia campos simples separados por virgula", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("lida com campos entre aspas contendo virgula e quebra de linha", () => {
    const text = 'name,address\n"Ana","Rua A, 123\nBloco B"';
    expect(parseCsv(text)).toEqual([
      ["name", "address"],
      ["Ana", "Rua A, 123\nBloco B"],
    ]);
  });

  it("lida com aspas duplicadas escapadas dentro de um campo", () => {
    const text = 'name\n"Jo""ao"';
    expect(parseCsv(text)).toEqual([["name"], ['Jo"ao']]);
  });

  it("ignora \\r de final de linha (CRLF)", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("retorna lista vazia para texto vazio", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseLocationsCsv", () => {
  it("reporta erro para arquivo vazio", () => {
    const result = parseLocationsCsv("");
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/vazio/i);
  });

  it("reporta erro quando falta a coluna name/nome", () => {
    const result = parseLocationsCsv("lat,lng\n1,2");
    expect(result.error).toMatch(/name/i);
  });

  it("reporta erro quando falta lat+lng e address", () => {
    const result = parseLocationsCsv("name\nAna");
    expect(result.error).toMatch(/lat|address/i);
  });

  it("aceita cabecalho em portugues (nome, latitude, longitude, demanda)", () => {
    const result = parseLocationsCsv(
      "nome,latitude,longitude,demanda\nAna,-3.1,-60.0,2"
    );
    expect(result.error).toBeUndefined();
    expect(result.rows).toEqual([
      { rowNumber: 1, name: "Ana", lat: -3.1, lng: -60.0, demand: 2, address: undefined },
    ]);
  });

  it("aceita cabecalho com address em vez de lat/lng", () => {
    const result = parseLocationsCsv(
      "name,address\nBruno,Av. Djalma Batista 100"
    );
    expect(result.error).toBeUndefined();
    expect(result.rows).toEqual([
      {
        rowNumber: 1,
        name: "Bruno",
        lat: undefined,
        lng: undefined,
        demand: undefined,
        address: "Av. Djalma Batista 100",
      },
    ]);
  });

  it("parseia multiplas linhas na ordem correta", () => {
    const result = parseLocationsCsv(
      "name,lat,lng\nAna,-3.1,-60.1\nBruno,-3.2,-60.2"
    );
    expect(result.rows.map((r) => r.name)).toEqual(["Ana", "Bruno"]);
    expect(result.rows.map((r) => r.rowNumber)).toEqual([1, 2]);
  });
});
