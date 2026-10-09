import type { PaisesPorCodigo, Ruta } from './tipos.js';

/**
 * Rutas terrestres con menos fronteras cruzadas.
 *
 * Cada país es un nodo y cada frontera es una arista sin peso. La ruta con menos
 * cruces es entonces el camino más corto en un grafo no ponderado, que se
 * resuelve con BFS: el primer camino que llega al destino es el más corto.
 */

function construirVecinos(paises: PaisesPorCodigo): Map<string, string[]> {
  const adyacencia = new Map<string, string[]>();

  for (const [codigo, pais] of paises) {
    adyacencia.set(
      codigo,
      pais.neighbors.map((vecino) => vecino.code),
    );
  }

  return adyacencia;
}

/**
 * Devuelve la ruta con menos fronteras entre dos países, o null si no hay
 * ninguna. Un país sin salida terrestre (una isla) simplemente no es alcanzable.
 */
export function buscarRutaTerrestre(paises: PaisesPorCodigo, desde: string, hasta: string): Ruta | null {
  const origen = paises.get(desde);

  if (origen === undefined || !paises.has(hasta)) {
    return null;
  }

  if (desde === hasta) {
    return { from: desde, to: hasta, crossings: 0, path: [{ code: desde, name: origen.name }] };
  }

  const anterior = rutaMasCorta(construirVecinos(paises), desde, hasta);

  if (anterior === null) {
    return null;
  }

  return construirRuta(paises, desde, hasta, anterior);
}

/**
 * BFS desde `desde` hasta `hasta`. Devuelve el país desde el que se llegó a
 * cada uno, que es lo único hace falta para reconstruir el camino al revés.
 */
function rutaMasCorta(
  adyacencia: ReadonlyMap<string, string[]>,
  desde: string,
  hasta: string,
): Map<string, string> | null {
  const cola: string[] = [desde];
  const visitados = new Set<string>([desde]);
  const anterior = new Map<string, string>();

  while (cola.length > 0) {
    const actual = cola.shift();

    if (actual === undefined) {
      break;
    }

    for (const siguiente of adyacencia.get(actual) ?? []) {
      if (visitados.has(siguiente)) {
        continue;
      }

      visitados.add(siguiente);
      anterior.set(siguiente, actual);

      if (siguiente === hasta) {
        return anterior;
      }

      cola.push(siguiente);
    }
  }

  return null;
}

/** Reconstruye el camino desde el final hacia el principio usando el mapa de antecesores. */
function construirRuta(
  paises: PaisesPorCodigo,
  desde: string,
  hasta: string,
  anterior: ReadonlyMap<string, string>,
): Ruta {
  const codigos: string[] = [hasta];

  let actual = hasta;

  while (actual !== desde) {
    const previo = anterior.get(actual);

    if (previo === undefined) {
      break;
    }

    codigos.unshift(previo);
    actual = previo;
  }

  const path = codigos.flatMap((codigo) => {
    const pais = paises.get(codigo);
    return pais === undefined ? [] : [{ code: codigo, name: pais.name }];
  });

  return {
    from: desde,
    to: hasta,
    crossings: path.length - 1,
    path,
  };
}
