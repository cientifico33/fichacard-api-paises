import { Router } from 'express';
import { z } from 'zod';
import type { ClienteFuente } from '../fuente/clienteRestCountries.js';
import type { ServicioPaises } from '../servicio/paises.js';

const CODIGO_PAIS = z.string().regex(/^[A-Za-z]{3}$/);

const esquemaRuta = z.object({
  from: CODIGO_PAIS,
  to: CODIGO_PAIS,
});

const esquemaRanking = z.object({
  sortBy: z.enum(['density', 'population', 'area']).default('density'),
  limit: z.coerce.number().int().min(1).max(50).default(5),
});

export function crearRutasPaises(servicio: ServicioPaises): Router {
  const rutas = Router();

  rutas.get('/countries/:code', async (peticion, respuesta) => {
    const { code } = z.object({ code: CODIGO_PAIS }).parse(peticion.params);

    respuesta.json(await servicio.porCodigo(code));
  });

  rutas.get('/routes', async (peticion, respuesta) => {
    const { from, to } = esquemaRuta.parse(peticion.query);

    respuesta.json(await servicio.ruta(from, to));
  });

  rutas.get('/regions/:region/ranking', async (peticion, respuesta) => {
    const { sortBy, limit } = esquemaRanking.parse(peticion.query);

    respuesta.json(await servicio.ranking(peticion.params.region, sortBy, limit));
  });

  return rutas;
}

export function crearRutaSalud(cliente: ClienteFuente): Router {
  const rutas = Router();

  rutas.get('/health', async (_peticion, respuesta) => {
    const fuenteViva = await cliente.estaViva();

    respuesta.status(fuenteViva ? 200 : 503).json({
      status: fuenteViva ? 'ok' : 'degraded',
      source: fuenteViva ? 'up' : 'down',
    });
  });

  return rutas;
}