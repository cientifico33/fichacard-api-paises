# API de países

API intermedia (middleware) sobre [REST Countries](https://restcountries.com). Recibe peticiones de
clientes, consulta REST Countries por dentro y devuelve la información transformada y enriquecida
con datos que la fuente original no ofrece: vecinos con nombre, densidad calculada y rutas
terrestres.

La idea es que los clientes nunca dependan del proveedor: si mañana cambiamos de API, el contrato
de esta API sigue igual.

## Requisitos

- Node.js 22.12 o superior
- Una API key gratuita de REST Countries (https://restcountries.com)

## Instalación

```bash
npm install
```

## Configuración

Copia el archivo de ejemplo y pon tu API key real:

```bash
cp .env.example .env
```

`.env` está en `.gitignore` y nunca se sube al repositorio. Si falta la llave, la aplicación falla al
arrancar y dice qué variable falta, en vez de fallar en la primera petición.

| Variable | Para qué sirve | Valor por defecto |
| --- | --- | --- |
| `REST_COUNTRIES_API_KEY` | Credencial para REST Countries | (obligatoria) |
| `PUERTO` | Puerto donde escucha la API | `3000` |
| `TIMEOUT_FUENTE_MS` | Milisegundos máximos de espera a la fuente | `8000` |
| `CACHE_TTL_MINUTOS` | Minutos que la caché conserva los datos | `60` |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta la API en modo desarrollo, con recarga automática |
| `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| `npm start` | Ejecuta la versión compilada |
| `npm run typecheck` | Revisa los tipos sin generar archivos |
| `npm test` | Corre las pruebas una vez |
| `npm run test:watch` | Corre las pruebas y espera cambios |

## Endpoints

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/countries/:code` | Detalle de un país, con vecinos y densidad calculada |
| `GET` | `/routes?from=XXX&to=YYY` | Ruta terrestre que cruza menos fronteras |
| `GET` | `/regions/:region/ranking?sortBy=density` | Ranking de países de una región |
| `GET` | `/health` | Estado de la API y de la fuente externa |

Los códigos de país se aceptan en mayúsculas o minúsculas.

## Ejemplos

```bash
# Detalle de un país
curl "http://localhost:3000/countries/GTM"

# Ruta con menos fronteras entre Guatemala y Panamá
curl "http://localhost:3000/routes?from=GTM&to=PAN"

# Los 5 países más densos de América
curl "http://localhost:3000/regions/Americas/ranking?sortBy=density&limit=5"

# Los 3 más poblados de Europa, ordenados por área
curl "http://localhost:3000/regions/Europe/ranking?sortBy=area&limit=3"

# Estado del servicio
curl "http://localhost:3000/health"
```

`GET /countries/GTM` responde:

```json
{
  "code": "GTM",
  "name": "Guatemala",
  "region": "Americas",
  "capital": "Guatemala City",
  "population": 18406359,
  "areaKm2": 108889,
  "densityPerKm2": 169.04,
  "currencies": ["GTQ"],
  "languages": ["Spanish"],
  "neighbors": [
    { "code": "BLZ", "name": "Belize" },
    { "code": "SLV", "name": "El Salvador" },
    { "code": "HND", "name": "Honduras" },
    { "code": "MEX", "name": "Mexico" }
  ]
}
```

`GET /routes?from=GTM&to=PAN` responde:

```json
{
  "from": "GTM",
  "to": "PAN",
  "crossings": 4,
  "path": [
    { "code": "GTM", "name": "Guatemala" },
    { "code": "HND", "name": "Honduras" },
    { "code": "NIC", "name": "Nicaragua" },
    { "code": "CRI", "name": "Costa Rica" },
    { "code": "PAN", "name": "Panama" }
  ]
}
```

## Formato de error

Todos los errores usan la misma forma, sin importar de dónde vengan:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No existe un país con el código XYZ."
  }
}
```

| Situación | Código HTTP | `error.code` |
| --- | --- | --- |
| Parámetro faltante o inválido | 400 | `INVALID_REQUEST` |
| País, región o endpoint inexistente | 404 | `NOT_FOUND` |
| Sin ruta terrestre entre dos países | 404 | `NO_LAND_ROUTE` |
| La fuente falla o no responde | 502 | `SOURCE_ERROR` |
| Error inesperado | 500 | `INTERNAL_ERROR` |

Un `401` o `403` de la fuente se responde como `500` a propósito: si la llave está mal eso es un
problema de configuración, no del cliente, y el mensaje de la fuente nunca se reenvía.

Los errores de validación no son los de zod. El texto que el validador prepara sirve para desarrollo,
pero puede incluir la expresión regular que falló y eso no lo puede leer quien está usando la
aplicación, así que la respuesta arma su propio texto a partir del código del problema y el nombre
del campo:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Revisa la petición: el campo code no tiene el formato esperado."
  }
}
```

## Decisiones de diseño

### Formato de la respuesta

La fuente devuelve códigos ISO anidados, mensajes en inglés y valores raros. En `src/pais/` está
definido el tipo `Pais` y todo lo que entra de afuera se traduce ahí. Cambiar de proveedor es
escribir otro cliente: las rutas y el contrato no se mueven.

### Capas

`transformar.ts`, `ruta.ts` y `ranking.ts` son funciones puras que reciben datos y devuelven datos.
No importan nada de `fetch` ni de `process.env`, así que se prueban sin red. El dominio es la parte
que más vale y la que más ICA es, y así se puede testear a diario sin montar nada.

### Rutas por BFS

Cada país es un nodo y cada frontera es una arista sin peso. El camino con menos cruces es el más
corto de un grafo no ponderado, que es justo lo que resuelve un BFS. Es O(V + E) y sobre 250 países
es instantáneo.

### Caché en memoria

Todos los endpoints necesitan el mapa completo de países, porque los vecinos se resuelven por
código. Ese mapa ya transformado se guarda en memoria y se reutiliza: una entrada guardada cubre
todas las peticiones.

El TTL es de **una hora** porque los datos de países cambian a lo largo de días, no de minutos. Una
hora mantiene la frescura sin gastar la cuota de la fuente. Si el refresco falla se sirve el valor
viejo en vez de devolver un error: datos de ayer son mejores que la API caída.

Un detalle: si llegan varias peticiones a la vez con la caché vacía, se lanza **una sola** carga. Sin
esto, diez peticiones simultáneas dispararían diez descargas y la mayoría se llevaría un error de
tasa.

### Timeout y reintentos

El reintento es único y solo ante un `5xx` o un fallo de red, esperando 300 ms. Un `4xx` no se
reintenta: una llave inválida o un parámetro mal pasado siguen siendo inválidos al segundo intento, y
solo se quema cuota. El timeout es de 8 segundos, el límite que pide el enunciado.

### Manejo de la API key

La llave se lee de `.env`, viaja solo en el encabezado `Authorization` y nunca se loguea ni aparece
en un mensaje de error. `.env` está en `.gitignore` desde el primer commit y `.env.example` va vacío.

### Express y zod

Express 5 propaga solo los errores que lanza un handler asíncrono, así que no hay que envolver cada
ruta con un `try/catch`. zod valida los parámetros de entrada y, como los esquemas se declaran una
sola vez, no hay forma de que una ruta acepte algo que otra no.

Si el proyecto creciera mucho, NestJS daría más estructura. Para cuatro endpoints sería ceremonia de
más.

### Lo que quedó fuera

- **Docker y CI**: no los pedían y solo agregaban archivos que mantener.
- **Librería de reintentos o de caché**: el reintento son unas líneas y la caché es un `Map` con
  una fecha de expiración. Ninguna dependencia extra.
- **dotenv**: Node ya trae `--env-file` desde la 20.

### Campos de la fuente

El enunciado pide el campo `capital`, pero en REST Countries v5 ese campo no existe: se llama
`capitals` y viene como arreglo de objetos. Pedir `capital` no da error, simplemente no viene nada y
la API respondería `null` para todos los países. Los campos que se piden están en un solo lugar
(`CAMPOS_SOLICITADOS`), con un comentario que explica la trampa.

### Faltan cuatro países

La fuente entrega 254 registros, pero cuatro no tienen código de tres letras: Abkhazia, Northern
Cyprus, Somaliland y South Ossetia. Son entidades en disputa que la fuente incluye como si fueran
países, y sin código alpha_3 no hay forma de pedirlas por URL ni de dibujar sus fronteras.

Se descartan al transformar (`esPaisUtil` en `src/pais/validarCrudo.ts`), así que la API trabalha
con **250 países**. La consecuencia práctica: buscar una de esas cuatro devuelve `404`, igual que un
código inventado. Si alguien necesita incluirlas, hay que cambiar la regla y no solo quitar el
filtro, porque el grafo de fronteras depende de que cada nodo tenga código.

## Estructura

```
src/
├── index.ts                  arranque y apagado ordenado
├── config/entorno.ts         lee y valida las variables de entorno
├── cache/cacheTtl.ts         caché en memoria con expiración
├── fuente/
│   └── clienteRestCountries.ts  timeout, reintento y paginación
├── pais/
│   ├── tipos.ts              contrato de la API
│   ├── tiposCrudos.ts        la forma de la fuente
│   ├── validarCrudo.ts       guarda de la respuesta y filtro de países
│   ├── transformar.ts        crudo → formato de la API
│   ├── ruta.ts               ruta terrestre (BFS)
│   └── ranking.ts            ranking por región
├── servicio/paises.ts        une caché, fuente y dominio
└── http/
    ├── rutas.ts              endpoints y validación
    ├── errores.ts            traducción de errores
    └── app.ts                configuración de Express
```

## Pruebas

```bash
npm test
```

Son 38 pruebas en dos grupos:

- **Unitarias**: transformación, ruta, ranking y caché. Sin red y sin fixtures pesados, con los
  casos límite del enunciado (área cero, país sin código, origen igual a destino, destino inalcanzable).
- **De integración**: `nock` simula la fuente para probar los endpoints de verdad, incluyendo la
  paginación, el reintento ante `5xx`, la ausencia de reintento ante `401` y que la llave nunca
  llegue a la respuesta.

Las pruebas no necesitan la API key ni conexión: la fuente está simulada.