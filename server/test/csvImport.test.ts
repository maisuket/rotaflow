import { describe, expect, it, vi } from "vitest";
import { resolveImportRows } from "../src/services/csvImport";

describe("resolveImportRows", () => {
  it("cria localizacoes diretamente quando lat/lng ja vem validos", async () => {
    const geocode = vi.fn();
    const { toCreate, errors } = await resolveImportRows(
      [{ name: "Ana", lat: -3.1, lng: -60.0, demand: 2 }],
      geocode
    );
    expect(errors).toEqual([]);
    expect(toCreate).toEqual([{ name: "Ana", lat: -3.1, lng: -60.0, demand: 2 }]);
    expect(geocode).not.toHaveBeenCalled();
  });

  it("usa demand=1 como padrao quando ausente ou invalido", async () => {
    const { toCreate } = await resolveImportRows(
      [
        { name: "Bruno", lat: 0, lng: 0 },
        { name: "Carla", lat: 0, lng: 0, demand: 0 },
        { name: "Davi", lat: 0, lng: 0, demand: -5 },
      ],
      vi.fn()
    );
    expect(toCreate.map((l) => l.demand)).toEqual([1, 1, 1]);
  });

  it("geocodifica linhas que so tem endereco (sem lat/lng)", async () => {
    const geocode = vi.fn().mockResolvedValue({ lat: -3.5, lng: -60.5 });
    const { toCreate, errors } = await resolveImportRows(
      [{ name: "Eva", address: "Av. Djalma Batista, Manaus" }],
      geocode
    );
    expect(errors).toEqual([]);
    expect(toCreate).toEqual([{ name: "Eva", lat: -3.5, lng: -60.5, demand: 1 }]);
    expect(geocode).toHaveBeenCalledWith("Av. Djalma Batista, Manaus");
  });

  it("reporta erro por linha sem interromper as demais", async () => {
    const geocode = vi.fn().mockResolvedValue(null);
    const { toCreate, errors } = await resolveImportRows(
      [
        { name: "", lat: 0, lng: 0 }, // nome ausente
        { name: "Fabio", lat: 999, lng: 0 }, // lat invalida, sem endereco
        { name: "Gustavo", address: "endereco que nao existe" }, // geocode retorna null
        { name: "Helena", lat: -3, lng: -60 }, // essa deve passar normalmente
      ],
      geocode
    );

    expect(toCreate).toEqual([{ name: "Helena", lat: -3, lng: -60, demand: 1 }]);
    expect(errors).toEqual([
      { row: 1, message: "Nome ausente" },
      { row: 2, message: "Sem coordenadas validas nem endereco" },
      { row: 3, message: 'Endereco nao encontrado: "endereco que nao existe"' },
    ]);
  });

  it("reporta erro quando a geocodificacao falha (excecao)", async () => {
    const geocode = vi.fn().mockRejectedValue(new Error("quota excedida"));
    const { toCreate, errors } = await resolveImportRows(
      [{ name: "Igor", address: "algum lugar" }],
      geocode
    );
    expect(toCreate).toEqual([]);
    expect(errors).toEqual([{ row: 1, message: "Erro ao buscar endereco: quota excedida" }]);
  });
});
