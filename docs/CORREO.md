# Correo (verificación de cuentas, recuperación de contraseña, invitaciones)

Sin un proveedor configurado **no sale ningún correo**. En desarrollo el enlace se imprime en la terminal donde corre `npm run dev`, y en producción el sistema avisa que no pudo enviar. Elige UNA opción.

## Opción A: Gmail (la más rápida, sin dominio propio)
1. En la cuenta de Google que enviará los correos activa la **verificación en dos pasos**.
2. Entra a https://myaccount.google.com/apppasswords y crea una **contraseña de aplicación** (16 letras). No es tu clave normal.
3. En `.env`:
```
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="tucorreo@gmail.com"
SMTP_PASS="abcdefghijklmnop"        # la contraseña de aplicación, sin espacios
EMAIL_FROM="Barber Shop <tucorreo@gmail.com>"
```
4. Reinicia el servidor. Gmail permite unos 500 correos al día, de sobra para una barbería.

## Opción B: Resend
1. Crea una cuenta en https://resend.com y una API key → `RESEND_API_KEY`.
2. `EMAIL_FROM="Barber Shop <avisos@tudominio.com>"`.
3. **Para enviar a cualquier persona hay que verificar un dominio propio** (registros DNS que Resend indica). Sin dominio verificado, Resend solo permite enviar a la dirección de tu propia cuenta de Resend; por eso «parece» que envía pero a los demás no les llega.

## Comprobar que funciona
Entra como propietario → **Correo** → «Enviar prueba». Si falla, el mensaje de error es el del proveedor y dice qué corregir.

## Problemas frecuentes
| Síntoma | Causa |
|---|---|
| «Invalid login» / «Username and Password not accepted» | Usaste la clave normal de Gmail: hace falta la contraseña de aplicación. |
| Resend responde 403 / «you can only send testing emails to your own email address» | Falta verificar un dominio. |
| El correo llegó a spam | Es normal al inicio; marca «no es spam». Un dominio propio con SPF/DKIM lo mejora. |
| Cambié el `.env` y nada cambia | Reinicia el servidor (en Vercel, vuelve a desplegar). |
| La invitación de un administrador dice que no se envió | Se muestra el enlace para copiarlo y enviarlo por WhatsApp mientras arreglas el correo. |
