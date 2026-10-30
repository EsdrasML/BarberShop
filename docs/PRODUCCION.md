# Puesta en producción y checklist para una barbería nueva

Cada barbería es **una instalación propia**: el mismo código, su propia base de datos, su bucket de imágenes y sus variables de entorno.

## Checklist para una barbería nueva
1. **Base de datos:** crea un proyecto en Neon. Copia la cadena *pooled* (`DATABASE_URL`) y la *directa* (`DIRECT_URL`).
2. **Imágenes (opcional):** crea un bucket en Cloudflare R2, activa su URL pública (r2.dev o dominio propio) y crea un token con permiso de lectura y escritura. Variables `R2_*`.
3. **Variables:** copia `.env.example` y complétalo. `AUTH_SECRET` debe ser **distinto** en cada barbería. `PLATFORM_OWNER_EMAILS` = tu correo. `SEED_ADMIN_*` = datos del administrador inicial.
4. **Migrar y sembrar** (desde tu computadora, con esas variables): `npx prisma migrate deploy` y `npm run db:seed`.
5. **Desplegar** (por ejemplo en Vercel; **para uso comercial hace falta el plan Pro**, el gratuito es solo personal): importa el repositorio, carga las variables de entorno (con `AUTH_URL` = la dirección pública, `https://…`) y despliega. El comando de build es `npm run build`.
6. **Google:** añade las URI de redirección con el dominio real (`docs/GOOGLE.md`) y publica la app si usarás Calendar.
7. **Correo:** configura SMTP o Resend y comprueba con **Correo → Enviar prueba** (`docs/CORREO.md`).
8. **Configurar el sitio** entrando como propietario: Marca y apariencia, Contacto y horarios, Servicios y precios, Sucursales. Crea un **administrador por sucursal** (Administradores).
9. **Revisar las páginas legales** (`/privacidad`, `/terminos`) y entregar al cliente su acceso.
10. Quita de `PLATFORM_OWNER_EMAILS` cualquier correo que no sea tuyo y revisa que el administrador del cliente **no** esté ahí.

## Variables de entorno (resumen)
| Variable | Uso |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | Neon (pooled para la app, directa para migraciones) |
| `AUTH_SECRET`, `AUTH_URL` | Sesiones; dirección pública del sitio |
| `PLATFORM_OWNER_EMAILS` | Quién es propietario de la plataforma |
| `SEED_ADMIN_*`, `SEED_OWNER_PASSWORD` | Cuentas iniciales (solo las usa el seed) |
| `SMTP_*` o `RESEND_API_KEY`, `EMAIL_FROM` | Correo |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY` | Google (login y Calendar) |
| `R2_*` | Imágenes |

Nunca subas el `.env` al repositorio (ya está en `.gitignore`) y ninguna de estas claves llega al navegador.

## Seguridad y operación
- Todas las reglas de permisos, precios, descuentos, puntos y alcance por sucursal se validan en el servidor.
- Las contraseñas se guardan con bcrypt; los permisos de Google, cifrados con AES-256-GCM.
- Respaldos: Neon ofrece restauración a un punto en el tiempo; revisa el plazo de tu plan.
- **No hay limitación de intentos de inicio de sesión** dentro de la aplicación. En producción actívala en el proveedor de despliegue (por ejemplo las reglas de firewall/rate limit de Vercel) o añádela como mejora.
- Si cambias el reloj o la zona horaria del negocio, hazlo en **Marca y apariencia** (por defecto `America/Guatemala`).
