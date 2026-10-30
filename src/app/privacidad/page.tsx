import { LegalPage } from "@/components/legal-page";
import { getShop } from "@/lib/shop";

export const metadata = { title: "Política de privacidad" };

export default async function PrivacyPage() {
  const shop = await getShop();
  const contact = [shop.email, shop.phone, shop.address].filter(Boolean).join(" · ") || "los datos de contacto publicados en el pie de esta página";
  return (
    <LegalPage title="Política de privacidad">
      <section>
        <h2>1. Quién es el responsable</h2>
        <p>{shop.name} es responsable del tratamiento de los datos personales que se recogen en este sitio. Puedes escribirnos o llamarnos usando {contact}.</p>
      </section>

      <section>
        <h2>2. Qué datos recopilamos</h2>
        <ul>
          <li><strong>Cuenta:</strong> nombre completo, correo electrónico, teléfono y tu contraseña (guardada cifrada; nunca la vemos).</li>
          <li><strong>Reservas:</strong> servicio, barbero, sucursal, fecha y hora, y el estado de la cita.</li>
          <li><strong>Ventas y puntos:</strong> importes, productos, método de pago y puntos acumulados. No guardamos números de tarjeta: los pagos se registran en el local.</li>
          <li><strong>Inicio de sesión con Google (opcional):</strong> tu nombre, correo y foto de perfil de Google.</li>
          <li><strong>Datos técnicos mínimos:</strong> una cookie de sesión necesaria para mantenerte conectado.</li>
        </ul>
      </section>

      <section>
        <h2>3. Para qué los usamos</h2>
        <ul>
          <li>Crear y administrar tu cuenta y tus citas.</li>
          <li>Registrar cobros, ventas y tu programa de puntos.</li>
          <li>Enviarte correos del servicio: verificación de cuenta, recuperación de contraseña y avisos de tus citas.</li>
          <li>Proteger el sitio y prevenir fraudes o cuentas falsas.</li>
          <li>Llevar estadísticas internas del negocio.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </section>

      <section>
        <h2>4. Información de Google</h2>
        <p><strong>Inicio de sesión:</strong> si eliges entrar con Google, recibimos solo tu nombre, correo y foto. Los usamos para crear y reconocer tu cuenta.</p>
        <p><strong>Google Calendar (solo barberos):</strong> cuando un barbero conecta su calendario, solicitamos el permiso para crear, modificar y eliminar los eventos de sus citas y para consultar sus eventos, únicamente para evitar que se reserven horarios en los que está ocupado. No leemos ni guardamos el contenido de esos eventos más allá de sus horas, no los compartimos y no los usamos para publicidad ni para entrenar modelos de inteligencia artificial. Los permisos de acceso se guardan cifrados.</p>
        <p>El uso y la transferencia a cualquier otra aplicación de la información recibida de las API de Google se ajustará a la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Política de datos de usuario de los servicios de las API de Google</a>, incluidos los requisitos de uso limitado.</p>
        <p>Puedes retirar el acceso en cualquier momento desde tu cuenta de Google (myaccount.google.com/permissions) o pidiendo que desconecten el calendario.</p>
      </section>

      <section>
        <h2>5. Con quién los compartimos</h2>
        <p>Solo con proveedores técnicos que nos permiten operar el sitio (alojamiento web, base de datos, almacenamiento de imágenes y envío de correo), bajo la finalidad de prestar el servicio. También podremos entregarlos a una autoridad cuando la ley lo exija.</p>
      </section>

      <section>
        <h2>6. Cuánto tiempo los conservamos</h2>
        <p>Mientras tu cuenta exista y mientras sea necesario para llevar el registro de ventas del negocio. Si pides eliminar tu cuenta, borraremos o anonimizaremos tus datos personales; los registros de ventas pueden conservarse sin datos que te identifiquen.</p>
      </section>

      <section>
        <h2>7. Tus derechos</h2>
        <p>Puedes pedir acceso a tus datos, corregirlos, que los eliminemos o limitar su uso. Escríbenos usando {contact} y te responderemos.</p>
      </section>

      <section>
        <h2>8. Cookies</h2>
        <p>Usamos únicamente la cookie de sesión necesaria para que inicies sesión. No usamos cookies de publicidad ni de seguimiento.</p>
      </section>

      <section>
        <h2>9. Seguridad</h2>
        <p>Las contraseñas se almacenan con cifrado irreversible, las conexiones usan HTTPS y los permisos de Google se guardan cifrados. Ningún sistema es perfecto, pero tomamos medidas razonables para proteger tu información.</p>
      </section>

      <section>
        <h2>10. Menores de edad</h2>
        <p>Este sitio no está dirigido a menores sin la autorización de un adulto responsable.</p>
      </section>

      <section>
        <h2>11. Cambios a esta política</h2>
        <p>Si la actualizamos, publicaremos la nueva versión aquí con su fecha.</p>
      </section>
    </LegalPage>
  );
}
