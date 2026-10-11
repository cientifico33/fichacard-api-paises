import nock from 'nock';
import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { crearApp } from '../http/app.js';
import { crearClienteRestCountries } from '../fuente/clienteRestCountries.js';
import { crearServicioPaises } from '../servicio/paises.js';

const URL_BASE = 'https://api.restcountries.com';
const LLAVE = 'rc_live_clave_de_pruebas';
const CAMPOS = 'codes.alpha_3,names.common,capitals,currencies,languages,borders,population,area.kilometers,region';

type ObjetoCrudo = Record<string, unknown>;

function pagina(objects: ObjetoCrudo[], offset: number, more: boolean) {
  return {
    data: {
      objects,
      meta: { total: objects.length, count: objects.length, limit: 100, offset, more },
    },
  };
}

function crearAplicacion() {
  const cliente = crearClienteRestCountries({ llave: LLAVE, timeoutMs: 8_000 });
  const servicio = crearServicioPaises(cliente, 60_000);

  return crearApp(servicio, cliente);
}

const GUATEMALA = {
  codes: { alpha_3: 'GTM' },
  names: { common: 'Guatemala' },
  capitals: [{ name: 'Guatemala City' }],
  region: 'Americas',
  area: { kilometers: 108_889 },
  population: 17_000_000,
  borders: ['HND'],
  currencies: [{ code: 'GTQ' }],
  languages: [{ name: 'Spanish' }],
};

const HONDURAS = {
  codes: { alpha_3: 'HND' },
  names: { common: 'Honduras' },
  capitals: [{ name: 'Tegucigalpa' }],
  region: 'Americas',
  area: { kilometers: 112_000 },
  population: 10_000_000,
  borders: ['GTM'],
  currencies: [{ code: 'HNL' }],
  languages: [{ name: 'Spanish' }],
};

afterEach(() => {
  nock.cleanAll();
});

describe('GET /countries/:code', () => {
  it('devuelve el país transformado con sus vecinos resueltos', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA, HONDURAS], 0, false));

    const respuesta = await request(crearAplicacion()).get('/countries/GTM');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({
      code: 'GTM',
      name: 'Guatemala',
      capital: 'Guatemala City',
      areaKm2: 108_889,
      densityPerKm2: 156.12,
      neighbors: [{ code: 'HND', name: 'Honduras' }],
    });
  });

  it('acepta el código en minúsculas', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA], 0, false));

    const respuesta = await request(crearAplicacion()).get('/countries/gtm');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.code).toBe('GTM');
  });

  it('devuelve 404 con el formato de la API cuando el país no existe', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA], 0, false));

    const respuesta = await request(crearAplicacion()).get('/countries/XXX');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.code).toBe('NOT_FOUND');
  });

  it('devuelve 400 si el código no tiene tres letras', async () => {
    const respuesta = await request(crearAplicacion()).get('/countries/GT');

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.code).toBe('INVALID_REQUEST');
  });
});

describe('consumo de la fuente', () => {
  it('pide los campos que necesita y envía la llave en el encabezado', async () => {
    let pidioLosCampos = false;
    let mandoLaLlave = false;

    nock(URL_BASE)
      .get('/countries/v5')
      .query((consulta) => {
        pidioLosCampos = consulta.response_fields === CAMPOS;
        return true;
      })
      .matchHeader('authorization', (valor) => {
        mandoLaLlave = valor === `Bearer ${LLAVE}`;
        return true;
      })
      .reply(200, pagina([GUATEMALA], 0, false));

    await request(crearAplicacion()).get('/countries/GTM');

    expect(pidioLosCampos).toBe(true);
    expect(mandoLaLlave).toBe(true);
  });

  it('recorre todas las páginas hasta que meta.more sea falso', async () => {
    const primera = nock(URL_BASE)
      .get('/countries/v5')
      .query((consulta) => consulta.offset === '0')
      .reply(200, pagina([GUATEMALA], 0, true));

    const segunda = nock(URL_BASE)
      .get('/countries/v5')
      .query((consulta) => consulta.offset === '1')
      .reply(200, pagina([HONDURAS], 1, false));

    const respuesta = await request(crearAplicacion()).get('/routes?from=GTM&to=HND');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.crossings).toBe(1);
    expect(primera.isDone()).toBe(true);
    expect(segunda.isDone()).toBe(true);
  });

  it('solo consulta la fuente una vez aunque se pidan varios países', async () => {
    const consultas = nock(URL_BASE)
      .get('/countries/v5')
      .query(true)
      .once()
      .reply(200, pagina([GUATEMALA, HONDURAS], 0, false));

    const aplicacion = crearAplicacion();

    await request(aplicacion).get('/countries/GTM');
    await request(aplicacion).get('/countries/HND');

    expect(consultas.isDone()).toBe(true);
  });
});

describe('errores de la fuente', () => {
  it('no reintenta ante un 401 y lo traduce sin filtrar la llave', async () => {
    const consulta = nock(URL_BASE)
      .get('/countries/v5')
      .query(true)
      .reply(401, { errors: [{ message: 'No matching authorization key found.' }] });

    const respuesta = await request(crearAplicacion()).get('/countries/GTM');

    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(respuesta.body)).not.toContain(LLAVE);
    expect(consulta.isDone()).toBe(true);
  });

  it('reintenta una vez ante un 5xx y responde 502 si vuelve a fallar', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).times(2).reply(503, { errors: [{ message: 'down' }] });

    const respuesta = await request(crearAplicacion()).get('/countries/GTM');

    expect(respuesta.status).toBe(502);
    expect(respuesta.body.error.code).toBe('SOURCE_ERROR');
  });

  it('reintenta y tiene éxito si la fuente vuelve', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(500, {});
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA], 0, false));

    const respuesta = await request(crearAplicacion()).get('/countries/GTM');

    expect(respuesta.status).toBe(200);
  });

  it('traduce a 502 una respuesta que no entiende', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, { sorpresa: true });

    const respuesta = await request(crearAplicacion()).get('/countries/GTM');

    expect(respuesta.status).toBe(502);
  });
});

describe('GET /routes', () => {
  it('devuelve 404 cuando no hay ruta terrestre', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA, HONDURAS], 0, false));

    const respuesta = await request(crearAplicacion()).get('/routes?from=GTM&to=JPN');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /health', () => {
  it('responde 200 cuando la fuente está viva', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).reply(200, pagina([GUATEMALA], 0, false));

    const respuesta = await request(crearAplicacion()).get('/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ status: 'ok', source: 'up' });
  });

  it('responde 503 cuando la fuente no responde', async () => {
    nock(URL_BASE).get('/countries/v5').query(true).times(2).reply(500, {});

    const respuesta = await request(crearAplicacion()).get('/health');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body.source).toBe('down');
  });
});

describe('endpoints desconocidos', () => {
  it('responde 404 con el formato de la API', async () => {
    const respuesta = await request(crearAplicacion()).get('/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.code).toBe('NOT_FOUND');
  });
});