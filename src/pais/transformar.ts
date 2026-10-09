import type { Pais, PaisesPorCodigo, Vecino } from './tipos.js';
import type { PaisCrudo } from './tiposCrudos.js';
import { esPaisUtil } from './validarCrudo.js';

/**
 * Convierte la respuesta de REST Countries al formato de la API.
 *
 * Todo lo que hay aquí son funciones puras: reciben datos y devuelven datos.
 * Nunca llaman a la fuente, así que se prueban sin internet.
 */

/**
 * Densidad de población: personas por kilómetro cuadrado.
 *
 * Sin área no hay densidad, así que se devuelve null en vez de cero para no
 * inventar un dato que el cliente tomaría como real.
 */
export function calcularDensidad(poblacion: number, areaKm2: number | null): number | null {
  if (areaKm2 === null || areaKm2 <= 0) {
    return null;
  }

  return Math.round((poblacion / areaKm2) * 100) / 100;
}

/**
 * La capital es un arreglo en la fuente. Nos quedamos con la primera, que es la
 * capital principal del país.
 */
function extraerCapital(crudo: PaisCrudo): string | null {
  const capitalPrincipal = crudo.capitals?.[0]?.name;
  if (capitalPrincipal !== undefined && capitalPrincipal !== '') {
    return capitalPrincipal;
  }

  return crudo.capital ?? null;
}

function extraerCodigosMoneda(crudo: PaisCrudo): string[] {
  return (crudo.currencies ?? [])
    .map((moneda) => moneda.code)
    .filter((codigo): codigo is string => typeof codigo === 'string' && codigo !== '');
}

function extraerNombresIdioma(crudo: PaisCrudo): string[] {
  return (crudo.languages ?? [])
    .map((idioma) => idioma.name)
    .filter((nombre): nombre is string => typeof nombre === 'string' && nombre !== '');
}

function transformarVecinos(crudo: PaisCrudo, nombresPorCodigo: ReadonlyMap<string, string>): Vecino[] {
  const vecinos: Vecino[] = [];

  for (const codigoFrontera of crudo.borders ?? []) {
    const nombre = nombresPorCodigo.get(codigoFrontera);

    // Una frontera que no se puede resolver no sirve para describir el país.
    if (nombre !== undefined) {
      vecinos.push({ code: codigoFrontera, name: nombre });
    }
  }

  return vecinos.sort((primero, segundo) => primero.name.localeCompare(segundo.name));
}

/**
 * Transforma todos los países de una vez.
 *
 * Recibe la lista completa porque para nombrar a los vecinos de un país
 * necesitamos conocer el nombre de todos los demás. Con el índice ya armado,
 * resolver cada vecindad es solo una consulta.
 */
export function transformarPaises(crudos: readonly PaisCrudo[]): PaisesPorCodigo {
  const utiles = crudos.filter(esPaisUtil);

  const nombresPorCodigo = new Map<string, string>();
  for (const crudo of utiles) {
    nombresPorCodigo.set(crudo.codes.alpha_3, crudo.names.common);
  }

  const paises = new Map<string, Pais>();

  for (const crudo of utiles) {
    const areaKm2 = crudo.area?.kilometers ?? null;
    const poblacion = crudo.population ?? 0;

    paises.set(crudo.codes.alpha_3, {
      code: crudo.codes.alpha_3,
      name: crudo.names.common,
      region: crudo.region ?? '',
      capital: extraerCapital(crudo),
      population: poblacion,
      areaKm2,
      densityPerKm2: calcularDensidad(poblacion, areaKm2),
      currencies: extraerCodigosMoneda(crudo),
      languages: extraerNombresIdioma(crudo),
      neighbors: transformarVecinos(crudo, nombresPorCodigo),
    });
  }

  return paises;
}
