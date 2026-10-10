import type { ErrorCrudo, PaisCrudo, PaginaCruda } from './tiposCrudos.js';

/**
 * Comprueba que la respuesta de la fuente tenga la forma que esperamos.
 *
 * Si REST Countries nos devuelve algo raro (un campo que cambió de nombre, un
 * error con otra estructura), preferimos enterarnos con un error claro en lugar
 * de dejar que un `undefined` se cuele hasta la respuesta final.
 */
export function esPaginaCruda(valor: unknown): valor is PaginaCruda {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const data = (valor as { data?: unknown }).data;

  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const { objects, meta } = data as { objects?: unknown; meta?: unknown };

  if (!Array.isArray(objects) || typeof meta !== 'object' || meta === null) {
    return false;
  }

  return typeof (meta as { more?: unknown }).more === 'boolean';
}

/**
 * ¿El país sirve para trabajar con él?
 *
 * La fuente incluye entidades como Abkhazia o Somaliland que no tienen código
 * alpha_3. No hay forma de pedirlas ni de trazar fronteras con ellas, así que se
 * descartan antes de entrar al dominio.
 */
export function esPaisUtil(pais: PaisCrudo): boolean {
  return pais.codes.alpha_3.trim().length === 3;
}

/**
 * Campos que le pedimos a REST Countries. Todo lo demás que venga en la
 * respuesta se descarta, lo que reduce el tamaño del tráfico y deja claro qué
 * datos usamos.
 *
 * Ojo: la capital se llama "capitals" y viene como arreglo de objetos con
 * "name". Un campo inexistente no da error, simplemente no viene en la
 * respuesta, así que conviene pedir el nombre correcto desde el principio.
 */
export const CAMPOS_SOLICITADOS = [
  'codes.alpha_3',
  'names.common',
  'capitals',
  'currencies',
  'languages',
  'borders',
  'population',
  'area.kilometers',
  'region',
].join(',');

/** ¿La respuesta tiene la forma de un error de la fuente? */
export function esErrorCrudo(valor: unknown): valor is ErrorCrudo {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const errores = (valor as { errors?: unknown }).errors;

  return Array.isArray(errores) && errores.length > 0;
}
