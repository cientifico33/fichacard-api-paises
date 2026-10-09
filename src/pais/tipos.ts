/**
 * Tipos del dominio de países.
 *
 * Son el contrato de la API: describen cómo se representa la
 * información, no cómo viene en REST Countries. Si el proveedor cambia sus
 * campos, aquí no se toca nada.
 */

export interface Vecino {
  code: string;
  name: string;
}

export interface Pais {
  code: string;
  name: string;
  region: string;
  capital: string | null;
  population: number;
  areaKm2: number | null;
  densityPerKm2: number | null;
  currencies: string[];
  languages: string[];
  neighbors: Vecino[];
}

export type OrdenarPor = 'density' | 'population' | 'area';

export interface ItemRanking {
  rank: number;
  code: string;
  name: string;
  value: number;
}

export interface Ranking {
  region: string;
  sortBy: OrdenarPor;
  count: number;
  items: ItemRanking[];
}

export interface Ruta {
  from: string;
  to: string;
  crossings: number;
  path: Vecino[];
}

/** Índice de países por código, usado para resolver vecinos sin buscarlos uno por uno. */
export type PaisesPorCodigo = ReadonlyMap<string, Pais>;
