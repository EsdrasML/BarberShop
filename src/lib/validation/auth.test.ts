import { describe, expect, it } from "vitest";
import { registerSchema } from "./auth";

const valid = {
  fullName: "Ana López",
  email: " ANA@Correo.com ",
  phone: "5555-1234",
  password: "Clave1234",
  confirmPassword: "Clave1234",
};

describe("registerSchema", () => {
  it("normaliza correo y teléfono", () => {
    const r = registerSchema.parse(valid);
    expect(r.email).toBe("ana@correo.com");
    expect(r.phone).toBe("55551234");
  });

  it("ignora un rol enviado en el formulario", () => {
    const r = registerSchema.parse({ ...valid, role: "ADMIN" });
    expect(r).not.toHaveProperty("role");
  });

  it("rechaza contraseñas débiles o distintas", () => {
    expect(registerSchema.safeParse({ ...valid, password: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...valid, confirmPassword: "Otra12345" }).success).toBe(false);
  });
});
