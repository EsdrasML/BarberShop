# Google: iniciar sesión y Google Calendar

Son dos funciones distintas. Iniciar sesión con Google **no** da permiso para tocar un calendario.

## 1. Proyecto y pantalla de consentimiento (una vez)
1. https://console.cloud.google.com → crea un proyecto.
2. *APIs y servicios → Pantalla de consentimiento de OAuth*: tipo **Externo**, nombre de la app, correo de soporte, y:
   - Página principal: tu dominio. **Política de privacidad:** `https://tudominio/privacidad`. **Términos:** `https://tudominio/terminos` (ya existen en el sitio).
   - Dominio autorizado: el de tu sitio (en producción).
3. *Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web*. Copia el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## 2. Iniciar sesión con Google
- URI de redireccionamiento autorizado: `{AUTH_URL}/api/auth/callback/google` (ejemplo: `http://localhost:3000/api/auth/callback/google`).
- Permisos: solo `openid`, `email` y `profile` (no sensibles).

## 3. Google Calendar de cada barbero
1. En la biblioteca de APIs, **habilita «Google Calendar API»**.
2. En la pantalla de consentimiento → *Acceso a los datos*: añade el permiso `https://www.googleapis.com/auth/calendar.events`.
3. En el mismo cliente OAuth añade otra URI de redirección: `{AUTH_URL}/api/google-calendar/callback`.
4. Genera la clave de cifrado y ponla en `TOKEN_ENCRYPTION_KEY`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
5. Reinicia. En **Barberos → (barbero) → Google Calendar** pulsa **Conectar con Google** e inicia sesión **con la cuenta de Google del barbero** (es su calendario el que se usa). Marca todas las casillas de permisos.

### Cómo se comporta
- Cita nueva → se crea el evento «Servicio · Cliente» en su calendario (con nombre y teléfono del cliente). Reprogramar → se actualiza. Cancelar → se elimina. Reintentar la misma operación **no duplica** eventos.
- Lo que el barbero tenga ocupado en su calendario (eventos con hora y los de día completo marcados como «Ocupado») **deja de ofrecerse** para reservar. Los eventos creados por el sistema no se cuentan dos veces, y los marcados «Disponible» no bloquean.
- Si Google no responde o el permiso venció, el sistema **no asume que el calendario está libre**: no ofrece horarios de ese barbero y lo avisa. El barbero aparece como «Necesita reautorizar» o «Con error»; basta con **Reconectar**.
- Si una sincronización falla, la cita queda marcada «Con error» y se reintenta con el botón **Reintentar sincronización** en el detalle de la cita. La reserva nunca se pierde por una falla de Google.
- **Desconectar** revoca el permiso y borra los tokens; los eventos ya creados se quedan en Google.

### Importante: modo «Prueba» y tokens que vencen
Mientras la app esté en modo **Prueba**, solo pueden conectar los correos añadidos como *usuarios de prueba*, y Google **vence los permisos a los 7 días**: el calendario pasaría a «Necesita reautorizar» cada semana. Para evitarlo, en la pantalla de consentimiento pulsa **Publicar aplicación** (estado «En producción»). Con el permiso de calendario Google mostrará un aviso de «app no verificada» a quien conecte; con menos de 100 usuarios puede usarse así. La verificación formal de Google (dominio propio, política de privacidad, video de demostración) quita ese aviso.

### Limitaciones
- Se usa el calendario principal (`primary`) de la cuenta.
- La sincronización es del sistema hacia Google; si alguien mueve a mano un evento creado por el sistema, el cambio no vuelve a la cita.
- La sincronización se ejecuta justo después de responder, así que el evento puede tardar unos segundos en aparecer.
