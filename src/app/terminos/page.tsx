import { LegalPage } from "@/components/legal-page";
import { getShop } from "@/lib/shop";

export const metadata = { title: "Términos y condiciones" };

export default async function TermsPage() {
  const shop = await getShop();
  const hours = shop.cancellationMinutes / 60;
  return (
    <LegalPage title="Términos y condiciones">
      <section>
        <h2>1. Aceptación</h2>
        <p>Al crear una cuenta o usar este sitio aceptas estos términos y la política de privacidad. Si no estás de acuerdo, no uses el servicio.</p>
      </section>

      <section>
        <h2>2. Tu cuenta</h2>
        <p>Debes dar datos verdaderos y mantener tu contraseña en secreto. Eres responsable de lo que ocurra con tu cuenta. Verificamos el correo para evitar cuentas falsas; podemos suspender cuentas con uso indebido.</p>
      </section>

      <section>
        <h2>3. Reservas</h2>
        <ul>
          <li>Las citas se reservan por servicio, barbero, sucursal, fecha y hora, según la disponibilidad que muestra el sitio.</li>
          <li>Puedes reprogramar o cancelar tu cita hasta {hours} {hours === 1 ? "hora" : "horas"} antes. Pasado ese plazo, comunícate con la barbería.</li>
          <li>El precio y la duración quedan fijados al reservar. Si llegas tarde, la barbería puede acortar o reprogramar el servicio.</li>
        </ul>
      </section>

      <section>
        <h2>4. Pagos</h2>
        <p>El sitio no procesa pagos en línea. El pago de servicios y productos se realiza en el local y se registra allí. Los precios pueden cambiar; los de una cita ya reservada se respetan.</p>
      </section>

      <section>
        <h2>5. Programa de puntos</h2>
        <ul>
          <li>Ganas {shop.pointsPerService} puntos por cada servicio completado y cobrado. Los puntos se acumulan en tu cuenta y valen en todas las sucursales.</li>
          <li>Al reunir {shop.pointsForBenefit} puntos puedes usar un beneficio de {shop.benefitPercent}% de descuento en un servicio, una sola vez; al usarlo se descuentan esos puntos.</li>
          <li>El descuento aplica al servicio, no a los productos. Los puntos no se canjean por dinero ni se transfieren.</li>
          <li>Si una venta se anula, los puntos ganados y el beneficio usado en ella se revierten.</li>
          <li>La barbería puede modificar las reglas del programa hacia el futuro.</li>
        </ul>
      </section>

      <section>
        <h2>6. Productos</h2>
        <p>El catálogo es informativo. La disponibilidad y el precio se confirman en el local.</p>
      </section>

      <section>
        <h2>7. Uso adecuado</h2>
        <p>No intentes acceder a cuentas ajenas, alterar el sitio, saturar el sistema ni hacer reservas falsas o repetidas para bloquear horarios.</p>
      </section>

      <section>
        <h2>8. Responsabilidad</h2>
        <p>Procuramos que el sitio funcione sin interrupciones, pero no garantizamos que esté libre de errores. No somos responsables por fallas de servicios de terceros fuera de nuestro control.</p>
      </section>

      <section>
        <h2>9. Cambios y contacto</h2>
        <p>Podemos actualizar estos términos y publicaremos la versión vigente aquí. Para cualquier duda, usa los datos de contacto del pie de página{shop.email ? ` o escribe a ${shop.email}` : ""}.</p>
      </section>

      <section>
        <h2>10. Ley aplicable</h2>
        <p>Estos términos se rigen por las leyes de la República de Guatemala.</p>
      </section>
    </LegalPage>
  );
}
