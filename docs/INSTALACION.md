# Instalación

## Requisitos
- Node.js 20 o superior (probado con 24).
- Una base de datos PostgreSQL en [Neon](https://neon.tech).
- Opcional según lo que uses: Cloudflare R2 (imágenes), Google Cloud (entrar con Google y Calendar), un proveedor de correo.

## Pasos
1. `npm install`
2. Copia `.env.example` a `.env` y completa los valores (cada variable está comentada).
   - `DATABASE_URL`: cadena **pooled** de Neon (el host lleva `-pooler`).
   - `DIRECT_URL`: cadena **directa** (sin `-pooler`); la usan las migraciones.
   - `AUTH_SECRET`: texto largo aleatorio (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
   - `PLATFORM_OWNER_EMAILS`: tu correo (propietario de la plataforma).
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`: acceso inicial de administrador.
3. Base de datos:
   - **Instalación nueva:** `npx prisma migrate deploy` aplica las migraciones guardadas en `prisma/migrations`.
   - **Desarrollo:** `npx prisma migrate dev --name <cambio>` crea y aplica una migración nueva cuando cambias `schema.prisma`.
4. `npm run db:seed` crea la configuración inicial, las sucursales provisionales, tres servicios de ejemplo y las cuentas iniciales.
5. `npm run dev` → http://localhost:3000. Comprobación: http://localhost:3000/api/health.

## Muy importante: la carpeta `prisma/migrations`
Es el historial de la base de datos. **No la borres ni la reemplaces.** Guárdala en el repositorio (git): es lo que permite crear la base de datos de una barbería nueva con `migrate deploy`. Al actualizar el código solo se reemplazan `prisma/schema.prisma` y `prisma/seed.ts`.

La migración del anti-solapamiento de citas se crea una sola vez:
`npx prisma migrate dev --create-only --name no_overlap`, pegar en el archivo SQL generado el contenido de `prisma/sql/appointment_no_overlap.sql` y ejecutar `npx prisma migrate dev`. Verifica con `/api/health` (`"overlapConstraint": true`).

## Comandos
| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Producción |
| `npm test` | Pruebas automáticas (disponibilidad, estados, puntos, ventas, fechas, cifrado…) |
| `npm run typecheck` | Verifica los tipos de TypeScript |
| `npm run db:studio` | Ver y editar la base de datos |
| `npm run db:seed` | Datos iniciales (se puede repetir sin duplicar) |

## Después de instalar
1. Entra con el administrador del seed y, desde el menú «Solo propietario», configura: **Marca y apariencia**, **Contacto y horarios**, **Servicios y precios**, **Sucursales** y **Administradores**.
2. Configura el correo (`docs/CORREO.md`) y comprueba con **Correo → Enviar prueba**.
3. Opcional: Google (`docs/GOOGLE.md`) y R2 para imágenes (`docs/PRODUCCION.md`).
