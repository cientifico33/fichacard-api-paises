/**
 * Caché en memoria con tiempo de expiración.
 *
 * La fuente cambia a lo largo de días, no de minutos: un TTL de una hora da
 * frescura suficiente sin recargar su API en cada petición. Si el refresco
 * falla, se sigue sirviendo el valor viejo antes que responder con un error:
 * datos un poco desactualizados son mejores que la API caída.
 */

interface Entrada<T> {
  valor: T;
  expira: number;
}

interface CacheTtl<T> {
  obtener(): Promise<T>;
}

export function crearCacheTtl<T>(cargar: () => Promise<T>, ttlMilisegundos: number): CacheTtl<T> {
  let entrada: Entrada<T> | null = null;
  let refrescoEnCurso: Promise<T> | null = null;

  return {
    async obtener(): Promise<T> {
      if (entrada !== null && Date.now() < entrada.expira) {
        return entrada.valor;
      }

      if (refrescoEnCurso !== null) {
        return refrescoEnCurso;
      }

      refrescoEnCurso = cargar()
        .then((valor) => {
          entrada = { valor, expira: Date.now() + ttlMilisegundos };
          return valor;
        })
        .catch((error: unknown) => {
          if (entrada !== null) {
            return entrada.valor;
          }

          throw error;
        })
        .finally(() => {
          refrescoEnCurso = null;
        });

      return refrescoEnCurso;
    },
  };
}
