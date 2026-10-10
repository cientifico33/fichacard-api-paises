import type { OrdenarPor, Pais, PaisesPorCodigo, Ranking, Ruta } from '../pais/tipos.js';
import { buscarRutaTerrestre } from '../pais/ruta.js';
import { generarRanking } from '../pais/ranking.js';
import { transformarPaises } from '../pais/transformar.js';
import { crearCacheTtl } from '../cache/cacheTtl.js';
import type { ClienteFuente } from '../fuente/clienteRestCountries.js';

export class PaisNoEncontrado extends Error {
  constructor(codigo: string) {
    super(`No existe un país con el código ${codigo}.`);
    this.name = 'PaisNoEncontrado';
  }
}

export class RegionNoEncontrada extends Error {
  constructor(region: string) {
    super(`No hay países registrados en la región ${region}.`);
    this.name = 'RegionNoEncontrada';
  }
}

export class SinRutaTerrestre extends Error {
  constructor(desde: string, hasta: string) {
    super(`No hay ruta terrestre entre ${desde} y ${hasta}.`);
    this.name = 'SinRutaTerrestre';
  }
}

export interface ServicioPaises {
  porCodigo(codigo: string): Promise<Pais>;
  ruta(desde: string, hasta: string): Promise<Ruta>;
  ranking(region: string, ordenarPor: OrdenarPor, limite: number): Promise<Ranking>;
}

export function crearServicioPaises(cliente: ClienteFuente, ttlMilisegundos: number): ServicioPaises {
  const cache = crearCacheTtl<PaisesPorCodigo>(
    async () => transformarPaises(await cliente.traerTodosLosPaises()),
    ttlMilisegundos,
  );

  function buscar(paises: PaisesPorCodigo, codigo: string): Pais {
    const pais = paises.get(codigo);

    if (pais === undefined) {
      throw new PaisNoEncontrado(codigo);
    }

    return pais;
  }

  return {
    async porCodigo(codigo: string): Promise<Pais> {
      return buscar(await cache.obtener(), codigo.toUpperCase());
    },

    async ruta(desde: string, hasta: string): Promise<Ruta> {
      const paises = await cache.obtener();
      const origen = desde.toUpperCase();
      const destino = hasta.toUpperCase();

      buscar(paises, origen);
      buscar(paises, destino);

      const ruta = buscarRutaTerrestre(paises, origen, destino);

      if (ruta === null) {
        throw new SinRutaTerrestre(desde, hasta);
      }

      return ruta;
    },

    async ranking(region: string, ordenarPor: OrdenarPor, limite: number): Promise<Ranking> {
      const paises = await cache.obtener();
      const resultado = generarRanking(paises, region, ordenarPor, limite);

      if (resultado.count === 0) {
        const existeLaRegion = [...paises.values()].some(
          (pais) => pais.region.toLowerCase() === region.toLowerCase(),
        );

        if (!existeLaRegion) {
          throw new RegionNoEncontrada(region);
        }
      }

      return resultado;
    },
  };
}
