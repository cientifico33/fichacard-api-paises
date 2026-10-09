import { z } from 'zod';

const esquemaEntorno = z.object({
  REST_COUNTRIES_API_KEY: z.string().trim().min(1),
  PUERTO: z.coerce.number().int().min(1).max(65535).default(3000),
  TIMEOUT_FUENTE_MS: z.coerce.number().int().min(1).max(8000).default(8000),
  CACHE_TTL_MINUTOS: z.coerce.number().int().min(1).default(60),
});

type Entorno = z.infer<typeof esquemaEntorno>;

/**
 * Lee y valida las variables de entorno.
 *
 * Falla en el arranque y no en la primera petición: una API sin su llave
 * apenas queda de manifiesto cuando un cliente ya recibe un error.
 */
export function leerEntorno(): Entorno {
  const resultado = esquemaEntorno.safeParse(process.env);

  if (!resultado.success) {
    const detalle = resultado.error.issues
      .map((falla) => `${falla.path.join('.')}: ${falla.message}`)
      .join(', ');

    throw new Error(`Configuración incompleta. Revisa el archivo .env (${detalle})`);
  }

  return resultado.data;
}
