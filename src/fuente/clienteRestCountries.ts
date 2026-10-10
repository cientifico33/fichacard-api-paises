import { CAMPOS_SOLICITADOS, esErrorCrudo, esPaginaCruda } from '../pais/validarCrudo.js';
import type { PaginaCruda, PaisCrudo } from '../pais/tiposCrudos.js';

const URL_BASE = 'https://api.restcountries.com/countries/v5';
const LIMITE_PAGINA = 100;
const ESPERA_ENTRE_INTENTOS_MS = 300;

/**
 * Fallo de la fuente externa, ya sea de red o de su API.
 *
 * Lleva el código HTTP de origen para que la capa de servicio decida cómo
 * traducirlo. Nunca expone la llave de acceso.
 */
export class ErrorDeFuente extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDeFuente';
  }
}

export interface ClienteFuente {
  traerTodosLosPaises(): Promise<PaisCrudo[]>;
  estaViva(): Promise<boolean>;
}

interface ConfiguracionCliente {
  llave: string;
  timeoutMs: number;
}

export function crearClienteRestCountries(config: ConfiguracionCliente): ClienteFuente {
  return {
    async traerTodosLosPaises(): Promise<PaisCrudo[]> {
      const paises: PaisCrudo[] = [];
      let offset = 0;
      let hayMasPaginas = true;

      while (hayMasPaginas) {
        const pagina = await pedirPagina(config, offset, LIMITE_PAGINA);
        const recibidos = pagina.data.objects;

        paises.push(...recibidos);
        hayMasPaginas = pagina.data.meta.more && recibidos.length > 0;
        offset += recibidos.length;
      }

      return paises;
    },

    async estaViva(): Promise<boolean> {
      try {
        await pedirPagina(config, 0, 1);
        return true;
      } catch {
        return false;
      }
    },
  };
}

async function pedirPagina(config: ConfiguracionCliente, offset: number, limite: number): Promise<PaginaCruda> {
  const url =
    `${URL_BASE}?response_fields=${CAMPOS_SOLICITADOS}` +
    `&limit=${limite}&offset=${offset}`;

  const cuerpo = await hacerPeticion(url, config);

  if (!esPaginaCruda(cuerpo)) {
    throw new ErrorDeFuente(502, 'La fuente devolvió una respuesta que no entendimos.');
  }

  return cuerpo;
}

/**
 * Hace la petición y reintenta una sola vez si el fallo es pasajero.
 *
 * Los errores 4xx son culpa de la petición (llave inválida, parámetro mal
 * pasado): reintentar solo los perpetúa. Los 5xx y los fallos de red sí valen
 * un segundo intento.
 */
async function hacerPeticion(url: string, config: ConfiguracionCliente): Promise<unknown> {
  try {
    return await intentarPeticion(url, config);
  } catch (error) {
    if (error instanceof ErrorDeFuente && error.status < 500) {
      throw error;
    }

    await esperar(ESPERA_ENTRE_INTENTOS_MS);

    try {
      return await intentarPeticion(url, config);
    } catch (segundoError) {
      if (segundoError instanceof ErrorDeFuente) {
        throw segundoError;
      }

      throw new ErrorDeFuente(503, 'La fuente externa no responde.');
    }
  }
}

async function intentarPeticion(url: string, config: ConfiguracionCliente): Promise<unknown> {
  let respuesta: Response;

  try {
    respuesta = await fetch(url, {
      headers: { Authorization: `Bearer ${config.llave}` },
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch {
    // Timeout o fallo de red: para la capa de servicio esto es "no responde".
    throw new ErrorDeFuente(503, 'La fuente externa no responde.');
  }

  if (!respuesta.ok) {
    throw new ErrorDeFuente(respuesta.status, await leerMensajeDeError(respuesta));
  }

  return respuesta.json();
}

/** La fuente informa sus errores como { errors: [ { message } ] }. */
async function leerMensajeDeError(respuesta: Response): Promise<string> {
  try {
    const cuerpo: unknown = await respuesta.json();

    if (esErrorCrudo(cuerpo)) {
      return cuerpo.errors[0]?.message ?? respuesta.statusText;
    }
  } catch {
    // Respaldo: puede venir HTML de un proxy en vez de JSON.
  }

  return respuesta.statusText;
}

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}
