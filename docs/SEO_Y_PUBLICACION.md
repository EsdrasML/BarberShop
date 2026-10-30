# Publicar el sitio y aparecer en Google (Guatemala)

Nadie puede garantizar una posición en Google. Lo que sí se controla: que Google **encuentre**, **entienda** y **confíe** en el sitio. Para una barbería, lo que más pesa es **Google Business Profile** (el recuadro con mapa de «barbería cerca de mí»), más que la página web sola.

## 1. Antes de publicar
- [ ] Completa en el panel (propietario): Marca y apariencia, **Google (búsquedas)**, Contacto y horarios, Servicios y precios, Sucursales, fotos reales.
- [ ] En **Google (búsquedas)** escribe: un título de hasta 60 caracteres con la palabra «barbería» y la zona (ej.: `Barbería en Zona 10, Ciudad de Guatemala | Nombre`), una descripción de hasta 160 caracteres y la ciudad.
- [ ] Dirección completa y teléfono en Contacto y horarios y en cada sucursal (se publican como datos estructurados para Google).
- [ ] Correo funcionando (`docs/CORREO.md`) y páginas `/privacidad` y `/terminos` revisadas (`docs/LEGAL.md`).
- [ ] Todo el contenido en español con la ciudad/zona, sin textos de relleno.

## 2. Dominio
- Un dominio propio (`nombrebarberia.com` o `.com.gt`) da confianza y es necesario para el correo profesional y Google. Compara precios entre registradores: el `.com.gt` cuesta bastante más en los registradores internacionales (por ejemplo, EuroDNS lo lista a €115 al año) y varía mucho, mientras que un `.com` suele ser más barato. Registra el dominio a nombre del negocio o deja claro en el contrato de quién es.
- Usa siempre la misma dirección (con o sin `www`) y que la otra redirija a ella.

## 3. Hosting (Vercel) y base de datos
1. Sube el proyecto a un repositorio de GitHub (privado). **No subas el `.env`.** Sí sube `prisma/migrations`.
2. En https://vercel.com importa el repositorio. **Para el negocio de un cliente necesitas el plan Pro:** el plan gratuito (Hobby) es solo para uso personal y no comercial.
3. Carga las variables de entorno (lista en `docs/PRODUCCION.md`), con `AUTH_URL=https://tudominio.com`.
4. **Región:** configura la región de las funciones de Vercel cerca de tu base de datos Neon (por ejemplo ambas en el este de EE. UU.). Es lo que más afecta la velocidad.
5. Desde tu computadora, con las variables de producción: `npx prisma migrate deploy` y `npm run db:seed`.
6. En Vercel → Domains, añade tu dominio y copia los registros DNS que indica en tu registrador.
7. Actualiza en Google Cloud las URI de redirección con el dominio real (`docs/GOOGLE.md`).

## 4. Google Search Console (que Google conozca el sitio)
1. https://search.google.com/search-console → *Añadir propiedad* → «Dominio» → verifica con el registro TXT en el DNS.
2. *Sitemaps* → envía `https://tudominio.com/sitemap.xml` (el sitio ya lo genera) y comprueba `https://tudominio.com/robots.txt`.
3. *Inspección de URL* → pega la portada → **Solicitar indexación**.
4. Revisa en unos días *Páginas* y *Mejoras* por si Google reporta algo.

## 5. Google Business Profile (lo más importante para búsquedas locales)
1. https://business.google.com → crea el perfil del negocio (uno por **cada sucursal**), con dirección real, teléfono y horarios.
2. Verifica el perfil (Google suele pedir una llamada, un código por correo o un video).
3. Categoría principal: «Barbería». Añade servicios con precios, el enlace del sitio (y el de **agendar cita**), fotos reales del local y del equipo.
4. Pide reseñas a clientes satisfechos y responde todas. Las reseñas pesan mucho.
5. Mantén **idénticos** nombre, dirección y teléfono (NAP) en Google, el sitio, Facebook e Instagram.

## 6. Lo que el sitio ya hace por ti
- Título y descripción por página (lo que Google muestra), y vista previa al compartir en WhatsApp/Facebook.
- `sitemap.xml` y `robots.txt` automáticos; los paneles, cuentas y API **no** se ofrecen a Google.
- Datos estructurados (`BarberShop`) con nombre, dirección, teléfono y redes, una entrada por sucursal.
- Idioma `es-GT`, página 404 con la marca, diseño adaptable a celular y carga rápida de imágenes (se comprimen al subirlas).

## 7. Tiempos esperados
Aparecer cuando buscan el **nombre** de la barbería: de unos días a un par de semanas. Aparecer en búsquedas como «barbería en zona 10»: de semanas a meses, y depende de la competencia, las reseñas y el perfil de Google. Actualizar fotos, reseñas y publicaciones del perfil con regularidad ayuda más que cualquier ajuste técnico.

## 8. Velocidad: cómo medirla
- https://pagespeed.web.dev con la dirección pública (en celular). Apunta a verde en «Rendimiento».
- Activa **Vercel Speed Insights** (no usa cookies) para ver tiempos reales de tus clientes.
- Si la primera visita tarda segundos y las siguientes son rápidas, suele ser el arranque en frío de la base de datos gratuita de Neon (se «duerme» tras unos minutos sin uso); un plan de pago puede mantenerla despierta.

## 9. Cookies
El sitio solo usa la cookie de sesión necesaria para iniciar sesión, por lo que no hace falta un banner de consentimiento. **Si más adelante añades Google Analytics, Meta Pixel o publicidad, sí hará falta** (y actualizar la política de privacidad). Para medir visitas sin banner, usa herramientas sin cookies (Vercel Analytics, Plausible).
