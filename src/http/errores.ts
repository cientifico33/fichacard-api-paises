import { ZodError } from 'zod';
import { ErrorDeFuente } from '../fuente/clienteRestCountries.js';
import { PaisNoEncontrado, RegionNoEncontrada, SinRutaTerrestre } from '../servicio/paises.js';

export interface RespuestaError {
  error: {
    code: string;
    message: string;
  };
}

interface RespuestaHttp {
  status: number;
  cuerpo: RespuestaError;
}

/**
 * Traduce cualquier fallo al formato de error de la API.
 *
 * El orden importa: los errores propios se revisan antes de los de la fuente, y
 * lo que no se reconoce cae en un 500 genérico. El cliente nunca recibe un
 * mensaje de la fuente ni detalles internos de la pila.
 */
export function construirRespuestaError(error: unknown): RespuestaHttp {
  if (error instanceof ZodError) {
    return errorCon(400, 'INVALID_REQUEST', descripcionDeValidacion(error));
  }

  if (error instanceof PaisNoEncontrado || error instanceof RegionNoEncontrada) {
    return errorCon(404, 'NOT_FOUND', error.message);
  }

  if (error instanceof SinRutaTerrestre) {
    return errorCon(404, 'NO_LAND_ROUTE', error.message);
  }

  if (error instanceof ErrorDeFuente) {
    return desdeErrorDeFuente(error);
  }

  return errorCon(500, 'INTERNAL_ERROR', 'Ocurrió un error inesperado.');
}

/**
 * Cada motivo de rechazo en palabras propias.
 *
 * El texto que zod prepara internamente sirve para desarrollo, pero no puede
 * viajar al cliente: puede incluir la expresión regular que falló y eso no lo
 * puede leer quien está usando la aplicación. Acá solo usamos el código del
 * problema y el nombre del campo.
 */
const MOTIVOS: Record<string, string> = {
  invalid_type: 'no es un valor válido',
  invalid_format: 'no tiene el formato esperado',
  invalid_value: 'no está entre las opciones válidas',
  too_small: 'está fuera del rango permitido',
  too_big: 'está fuera del rango permitido',
};

function descripcionDeValidacion(error: ZodError): string {
  const detalles = error.issues.map((falla) => {
    const campo = falla.path.join('.');
    const motivo = MOTIVOS[falla.code ?? ''] ?? 'tiene un valor inválido';

    return `el campo ${campo} ${motivo}`;
  });

  return `Revisa la petición: ${detalles.join('; ')}.`;
}

/**
 * Un 401 o 403 de la fuente es problema de configuración, no de la
 * petición del cliente: por eso se responde 500 y no se reenvía el mensaje.
 */
function desdeErrorDeFuente(error: ErrorDeFuente): RespuestaHttp {
  if (error.status === 401 || error.status === 403) {
    return errorCon(500, 'INTERNAL_ERROR', 'No pudimos consultar la fuente de datos.');
  }

  return errorCon(502, 'SOURCE_ERROR', 'La fuente de datos no está disponible en este momento.');
}

function errorCon(status: number, code: string, message: string): RespuestaHttp {
  return { status, cuerpo: { error: { code, message } } };
}