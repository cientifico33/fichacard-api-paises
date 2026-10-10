import { describe, expect, it } from 'vitest';
import { generarRanking } from '../ranking.js';
import type { Pais } from '../tipos.js';

function pais(
  code: string,
  region: string,
  valores: { poblacion?: number; areaKm2?: number | null; densidad?: number | null },
): Pais {
  return {
    code,
    name: code,
    region,
    capital: null,
    population: valores.poblacion ?? 0,
    areaKm2: valores.areaKm2 ?? null,
    densityPerKm2: valores.densidad ?? null,
    currencies: [],
    languages: [],
    neighbors: [],
  };
}

const AMERICAS = new Map<string, Pais>([
  ['SLV', pais('SLV', 'Americas', { poblacion: 6_400_000, areaKm2: 21_000, densidad: 299.42 })],
  ['GTM', pais('GTM', 'Americas', { poblacion: 17_000_000, areaKm2: 108_889, densidad: 156.12 })],
  ['HND', pais('HND', 'Americas', { poblacion: 10_000_000, areaKm2: 112_000, densidad: 89.28 })],
  ['ESP', pais('ESP', 'Europe', { poblacion: 48_000_000, areaKm2: 505_000, densidad: 95.05 })],
]);

describe('generarRanking', () => {
  it('ordena de mayor a menor según el criterio pedido', () => {
    const ranking = generarRanking(AMERICAS, 'Americas', 'density', 5);

    expect(ranking.items.map((item) => item.code)).toEqual(['SLV', 'GTM', 'HND']);
    expect(ranking.items[0]?.rank).toBe(1);
    expect(ranking.items[2]?.rank).toBe(3);
  });

  it('acepta la región sin importar mayúsculas ni acentos de capitalización', () => {
    const ranking = generarRanking(AMERICAS, 'americas', 'population', 5);

    expect(ranking.count).toBe(3);
    expect(ranking.items[0]?.code).toBe('GTM');
  });

  it('excluye los países sin el dato necesario para ordenar', () => {
    const conHueco = new Map(AMERICAS);
    conHueco.set('XCA', pais('XCA', 'Americas', { poblacion: 5_000_000, areaKm2: null }));

    const ranking = generarRanking(conHueco, 'Americas', 'area', 10);

    expect(ranking.items.map((item) => item.code)).not.toContain('XCA');
  });

  it('respeta el límite pedido', () => {
    const ranking = generarRanking(AMERICAS, 'Americas', 'population', 2);

    expect(ranking.count).toBe(2);
    expect(ranking.items).toHaveLength(2);
  });

  it('devuelve una lista vacía si la región no tiene países', () => {
    const ranking = generarRanking(AMERICAS, 'Atlantis', 'density', 5);

    expect(ranking.count).toBe(0);
    expect(ranking.items).toEqual([]);
  });
});