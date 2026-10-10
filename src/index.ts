import { leerEntorno } from './config/entorno.js';
import { crearClienteRestCountries } from './fuente/clienteRestCountries.js';
import { crearServicioPaises } from './servicio/paises.js';
import { crearApp } from './http/app.js';

const MS_POR_MINUTO = 60_000;

const entorno = leerEntorno();

const cliente = crearClienteRestCountries({
  llave: entorno.REST_COUNTRIES_API_KEY,
  timeoutMs: entorno.TIMEOUT_FUENTE_MS,
});

const servicio = crearServicioPaises(cliente, entorno.CACHE_TTL_MINUTOS * MS_POR_MINUTO);
const app = crearApp(servicio, cliente);

const servidor = app.listen(entorno.PUERTO, () => {
  console.log(`API de países escuchando en el puerto ${entorno.PUERTO}`);
});

function apagar(): void {
  console.log('Cerrando el servidor...');
  servidor.close(() => process.exit(0));
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);