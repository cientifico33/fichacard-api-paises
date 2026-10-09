import type { ItemRanking, OrdenarPor, Pais, PaisesPorCodigo, Ranking } from './tipos.js';

/**
 * Ranking de los países de una región.
 *
 * El valor a ordenar vive en un campo distinto según el criterio, así que aquí
 * se decide cuál leer en lugar de repetir el switch en cada punto de uso.
 */
function valorSegun(pais: Pais, ordenarPor: OrdenarPor): number | null {
  switch (ordenarPor) {
    case 'density':
      return pais.densityPerKm2;
    case 'population':
      return pais.population;
    case 'area':
      return pais.areaKm2;
  }
}

/**
 * La región que devuelve la fuente está en inglés y con mayúsculas
 * ("Americas"). Comparamos sin distinguir mayúsculas ni espacios para que
 * /regions/americas/ranking también funcione.
 */
function esDeRegion(pais: Pais, region: string): boolean {
  return pais.region.toLowerCase() === region.toLowerCase();
}

export function generarRanking(
  paises: PaisesPorCodigo,
  region: string,
  ordenarPor: OrdenarPor,
  limite: number,
): Ranking {
  const items: ItemRanking[] = [];

  for (const pais of paises.values()) {
    if (!esDeRegion(pais, region)) {
      continue;
    }

    const valor = valorSegun(pais, ordenarPor);

    // Un país sin el dato que se pidió no se puede ordenar, así que no entra.
    if (valor === null) {
      continue;
    }

    items.push({ rank: 0, code: pais.code, name: pais.name, value: valor });
  }

  items.sort((primero, segundo) => segundo.value - primero.value);
  const primeros = items.slice(0, limite);

  primeros.forEach((item, posicion) => {
    item.rank = posicion + 1;
  });

  return { region, sortBy: ordenarPor, count: primeros.length, items: primeros };
}
