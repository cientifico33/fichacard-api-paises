# API de países

API intermedia (middleware) sobre [REST Countries](https://restcountries.com). Recibe peticiones de
clientes, consulta REST Countries por dentro y devuelve la información transformada y enriquecida
con datos que la fuente original no ofrece.

La idea es que los clientes nunca dependan del proveedor: si mañana cambiamos de API, el contrato
de esta API sigue igual.

## Requisitos

- Node.js 20 o superior
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

`.env` está en `.gitignore` y nunca se sube al repositorio. Las variables disponibles son:

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

## Formato de error

Todos los errores usan la misma forma:

```json
{
  "error": {
    "code": "COUNTRY_NOT_FOUND",
    "message": "No existe un país con el código XYZ."
  }
}
```
