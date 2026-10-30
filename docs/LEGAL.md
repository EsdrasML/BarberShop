# Privacidad y términos

Las páginas públicas están en `/privacidad` y `/terminos` (código en `src/app/privacidad` y `src/app/terminos`). Se rellenan solas con el nombre, contacto, plazo de cancelación y reglas de puntos del negocio.

**Son plantillas razonables, no asesoría legal.** Antes de entregar el sitio a un cliente, que las revise un abogado de ese negocio, y:
1. Verifica que el contacto (correo, teléfono, dirección) esté completo en *Contacto y horarios*: la política remite a él para ejercer derechos.
2. Si el negocio usa servicios adicionales que traten datos (otro proveedor de correo, analítica, etc.), añádelos a la sección «Con quién los compartimos».
3. Cambia la fecha en `src/components/legal-page.tsx` (`LEGAL_UPDATED`) cada vez que edites el texto.
4. Si publicas la app de Google en producción, usa estas dos direcciones en la pantalla de consentimiento (`docs/GOOGLE.md`). La sección «Información de Google» ya incluye la declaración de **uso limitado** que Google exige.

El registro con contraseña exige aceptar ambos documentos y deja constancia en el historial de auditoría (`user.accept_terms`). Quien entra con Google ve el aviso junto al botón.
