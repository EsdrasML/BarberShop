# Sistema integral para barberías

Next.js (App Router) + TypeScript + Prisma + Neon (PostgreSQL) + Auth.js. Un solo proyecto para el sitio público, los paneles y la API. Pensado para reutilizarse: **una instalación por barbería**.

## Inicio rápido
```bash
npm install
cp .env.example .env          # completa las variables
npx prisma migrate deploy     # instala la base de datos
npm run db:seed               # datos iniciales
npm run dev                   # http://localhost:3000
```

## Documentación
| Archivo | Contenido |
|---|---|
| [`docs/INSTALACION.md`](docs/INSTALACION.md) | Instalación paso a paso, comandos y la carpeta de migraciones |
| [`docs/CORREO.md`](docs/CORREO.md) | Configurar el envío de correos (Gmail o Resend) y diagnosticar |
| [`docs/GOOGLE.md`](docs/GOOGLE.md) | Iniciar sesión con Google y Google Calendar |
| [`docs/PRODUCCION.md`](docs/PRODUCCION.md) | Despliegue, variables y checklist para una barbería nueva |
| [`docs/SEO_Y_PUBLICACION.md`](docs/SEO_Y_PUBLICACION.md) | Publicar el sitio y aparecer en Google (Guatemala) |
| [`docs/COSTOS_Y_PRECIOS.md`](docs/COSTOS_Y_PRECIOS.md) | Costos reales y cuánto cobrar a una barbería |
| [`docs/FUNCIONES.md`](docs/FUNCIONES.md) | Roles, módulos, reglas y limitaciones |
| [`docs/LEGAL.md`](docs/LEGAL.md) | Política de privacidad y términos |

## Reglas que conviene recordar
- **No borres `prisma/migrations`:** es el historial de la base de datos (guárdalo en git).
- El `.env` no se sube al repositorio. Ninguna clave llega al navegador.
- El propietario se define solo por `PLATFORM_OWNER_EMAILS`; el administrador de la barbería no puede cambiar la marca, los precios, las sucursales ni los administradores.
- Pruebas: `npm test` · Tipos: `npm run typecheck`.
