import { ForgotForm } from "@/components/auth/forgot-form";
import { Card } from "@/components/ui/card";

export default function ForgotPage() {
  return (
    <Card>
      <h1 className="sub-section mb-3">Recuperar contraseña</h1>
      <p className="mb-8 text-steel">Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña.</p>
      <ForgotForm />
    </Card>
  );
}
