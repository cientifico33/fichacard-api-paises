import { describe, expect, it } from 'vitest';
import { calcularDensidad, transformarPaises } from '../transformar.js';
import type { PaisCrudo } from '../tiposCrudos.js';

function pais(overrides: Partial<PaisCrudo> = {}): PaisCrudo {
  return {
    codes: { alpha_3: 'GTM' },
    names: { common: 'Guatemala' },
    region: 'Americas',
    capitals: [{ name: 'Guatemala City' }],
    population: 17_000_000,
    area: { kilometers: 108_889 },
    borders: [],
    currencies: [{ code: 'GTQ' }],
    languages: [{ name: 'Spanish' }],
    ...overrides,
  };
}

describe('calcularDensidad', () => {
  it('divide la población entre el área y redondea a dos decimales', () => {
    expect(calcularDensidad(17_000_000, 108_889)).toBe(156.12);
  });

  it('devuelve null si el área es cero', () => {
    expect(calcularDensidad(17_000_000, 0)).toBeNull();
  });

  it('devuelve null si no se conoce el área', () => {
    expect(calcularDensidad(17_000_000, null)).toBeNull();
  });
});

describe('transformarPaises', () => {
  it('convierte la fuente al formato de la API', () => {
    const [guatemala] = [...transformarPaises([pais()]).values()];

    expect(guatemala).toEqual({
      code: 'GTM',
      name: 'Guatemala',
      region: 'Americas',
      capital: 'Guatemala City',
      population: 17_000_000,
      areaKm2: 108_889,
      densityPerKm2: 156.12,
      currencies: ['GTQ'],
      languages: ['Spanish'],
      neighbors: [],
    });
  });

  it('resuelve los vecinos por nombre y los ordena alfabéticamente', () => {
    const vecinos = ['HND', 'BLZ', 'MEX'].map((codigo) => ({
      codes: { alpha_3: codigo },
      names: { common: { HND: 'Honduras', BLZ: 'Belize', MEX: 'Mexico' }[codigo] ?? codigo },
    }));

    const paises = transformarPaises([
      pais({ borders: ['HND', 'BLZ', 'MEX'] }),
      ...vecinos,
    ]);

    expect(paises.get('GTM')?.neighbors).toEqual([
      { code: 'BLZ', name: 'Belize' },
      { code: 'HND', name: 'Honduras' },
      { code: 'MEX', name: 'Mexico' },
    ]);
  });

  it('descarta los países sin código alpha_3', () => {
    const somatico = pais({ codes: { alpha_3: '' }, names: { common: 'Somaliland' } });

    expect(transformarPaises([pais(), somatico]).size).toBe(1);
  });

  it('deja la capital en null cuando la fuente no la manda', () => {
    const sinCapital = pais({ capitals: [] });

    expect(transformarPaises([sinCapital]).get('GTM')?.capital).toBeNull();
  });

  it('ignora las fronteras que no corresponden a ningún país conocido', () => {
    const paises = transformarPaises([pais({ borders: ['XYZ'] })]);

    expect(paises.get('GTM')?.neighbors).toEqual([]);
  });
});