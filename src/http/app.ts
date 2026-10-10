import express from 'express';
import cors from 'cors';
import type { ClienteFuente } from '../fuente/clienteRestCountries.js';
import type { ServicioPaises } from '../servicio/paises.js';
import { construirRespuestaError } from './errores.js';
import { crearRutasPaises, crearRutaSalud } from './rutas.js';

export function crearApp(servicio: ServicioPaises, cliente: ClienteFuente) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(crearRutaSalud(cliente));
  app.use(crearRutasPaises(servicio));

  app.use((_peticion, respuesta) => {
    respuesta.status(404).json({
      error: { code: 'NOT_FOUND', message: 'El endpoint solicitado no existe.' },
    });
  });

  // Solo Express 5 llega aquí cuando el handler lanza, sin envolver cada ruta.
  app.use(
    (
      error: unknown,
      _peticion: express.Request,
      respuesta: express.Response,
      _siguiente: express.NextFunction,
    ): void => {
      const { status, cuerpo } = construirRespuestaError(error);
      respuesta.status(status).json(cuerpo);
    },
  );

  return app;
}