import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Las pruebas entienden el alias "@/..." igual que Next.js.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    // Valores de relleno: algunos módulos crean el cliente de Prisma al importarse, pero las pruebas nunca tocan la base de datos.
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      DIRECT_URL: "postgresql://test:test@localhost:5432/test",
      AUTH_SECRET: "secreto-solo-para-pruebas",
    },
  },
});
