# Qué hace el sistema

## Roles
| Rol | Alcance |
|---|---|
| **Propietario** (tú) | Todo, más la configuración del sitio: marca, contacto y horarios, servicios y precios, sucursales, administradores, correo. Se define con `PLATFORM_OWNER_EMAILS`. |
| **Administrador general** | Citas, clientes, barberos, productos, ventas y walk-in de **todas** las sucursales. |
| **Administrador de sucursal** | Lo mismo, pero **solo de su sucursal** (la sucursal se asigna sola al cobrar; ventas y PDF solo de la suya). |
| **Cliente** | Se registra (con verificación de correo) o entra con Google; reserva, reprograma y cancela; ve su historial y sus puntos. |

No hay panel de barbero: los barberos con cita tienen horario y, si quieren, su Google Calendar conectado; los que atienden por orden de llegada se registran como walk-in.

## Módulos
- **Página pública:** servicios, conócenos, productos y pie con sucursales, horarios y redes; todo leído de la base de datos. Páginas de privacidad y términos.
- **Reservas:** sucursal → servicio → barbero → fecha (tira de 7 días o calendario completo) → hora. Duración de 50 minutos por defecto (configurable por servicio). Una cita ocupa todo su intervalo; se validan jornada, ausencias, otras citas y eventos de Google Calendar, y se vuelve a validar al guardar dentro de una transacción con bloqueo por barbero.
- **Citas (administrador):** lista con filtros, cita manual, y tres acciones: **En proceso**, **Completar y cobrar** y **Cancelar**; además reprogramar. Estados: Pendiente, Confirmada, En atención, Completada, Cancelada, No asistió.
- **Cobro y ventas:** servicio de la cita (precio acordado al reservar) + productos opcionales; se registra el **monto cobrado**, que debe coincidir con el total (el servidor lo valida); sin pasarelas ni método de pago; anulación auditable. **Walk-in** para clientes sin cita: con cliente registrado (suma puntos), como **Visita** (persona de paso: se cobra sin guardar sus datos y sin puntos) o solo venta de productos.
- **Puntos:** 25 por servicio cobrado, una sola vez por servicio; con 100 puntos, 50% de descuento en el servicio (un solo uso, descuenta los puntos). Los puntos son del cliente y valen en todas las sucursales. Se pueden cambiar las reglas en *Contacto y horarios*.
- **Reporte de ventas:** total de ingresos, total en cortes, total en productos y total de descuentos, por periodo y sucursal, con lista de ventas y **PDF mensual**.
- **Clientes del local:** se registran sin cuenta; si luego se registran con ese correo verificado, su cuenta se une sola y ven su historial.
- **Google Calendar** por barbero, **correo** con diagnóstico, **auditoría** de acciones importantes.

## Limitaciones conocidas
- Sin pasarela de pagos en línea (por diseño).
- Sin vista de calendario de cuadrícula para el administrador (lista con filtros).
- El inventario de productos es único para todas las sucursales.
- Sin límite de intentos de inicio de sesión (ver `docs/PRODUCCION.md`).
- Google Calendar es unidireccional para las citas (sistema → Google); los eventos de otros usos solo bloquean horarios.
- Si se anula una venta vieja y el cliente ya gastó esos puntos, su saldo puede quedar negativo (se prefiere no ocultar la corrección).
