import { describe, expect, it } from 'vitest';
import { buscarRutaTerrestre } from '../ruta.js';
import type { Pais, PaisesPorCodigo } from '../tipos.js';

function pais(code: string, vecinos: string[]): Pais {
  return {
    code,
    name: code,
    region: '',
    capital: null,
    population: 0,
    areaKm2: null,
    densityPerKm2: null,
    currencies: [],
    languages: [],
    neighbors: vecinos.map((vecino) => ({ code: vecino, name: vecino })),
  };
}

function paises(...definiciones: [string, string[]][]): PaisesPorCodigo {
  return new Map(definiciones.map(([code, vecinos]) => [code, pais(code, vecinos)]));
}

/** Guate, Hon, Nic, Cos y Pan encadenados: la ruta más corta son 4 cruces. */
const AMERICA_CENTRAL = paises(
  ['GTM', ['HND', 'BLZ', 'SLV', 'MEX']],
  ['HND', ['GTM', 'NIC', 'SLV']],
  ['NIC', ['HND', 'CRI']],
  ['CRI', ['NIC', 'PAN']],
  ['PAN', ['CRI']],
  ['BLZ', ['GTM']],
  ['SLV', ['GTM', 'HND']],
  ['MEX', ['GTM']],
);

describe('buscarRutaTerrestre', () => {
  it('devuelve la ruta con menos fronteras cruzadas', () => {
    const ruta = buscarRutaTerrestre(AMERICA_CENTRAL, 'GTM', 'PAN');

    expect(ruta?.crossings).toBe(4);
    expect(ruta?.path.map((paso) => paso.code)).toEqual(['GTM', 'HND', 'NIC', 'CRI', 'PAN']);
  });

  it('no cruza ninguna frontera cuando el origen es el destino', () => {
    const ruta = buscarRutaTerrestre(AMERICA_CENTRAL, 'GTM', 'GTM');

    expect(ruta?.crossings).toBe(0);
    expect(ruta?.path).toEqual([{ code: 'GTM', name: 'GTM' }]);
  });

  it('devuelve null si el destino no tiene salida terrestre', () => {
    const conIsla = paises(['GTM', ['HND']], ['HND', ['GTM']], ['JPN', []]);

    expect(buscarRutaTerrestre(conIsla, 'GTM', 'JPN')).toBeNull();
  });

  it('devuelve null si algún código no existe', () => {
    expect(buscarRutaTerrestre(AMERICA_CENTRAL, 'GTM', 'XXX')).toBeNull();
  });

  it('elige el camino más corto cuando hay dos rutas posibles', () => {
    const dosCaminos = paises(
      ['A', ['B', 'C']],
      ['B', ['A', 'D']],
      ['C', ['A', 'E']],
      ['D', ['B', 'E']],
      ['E', ['C', 'D']],
    );

    const ruta = buscarRutaTerrestre(dosCaminos, 'A', 'D');

    expect(ruta?.crossings).toBe(2);
    expect(ruta?.path.map((paso) => paso.code)).toEqual(['A', 'B', 'D']);
  });
});