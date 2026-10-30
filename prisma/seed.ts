// Datos de demostración. Todo se puede editar después desde el panel de administración.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.shopSettings.upsert({
    where: { id: "shop" },
    update: {},
    create: { id: "shop", primaryColor: "#000000", accentColor: "#FFC000" },
  });

  // Sucursales provisionales (el propietario les pone nombre y dirección reales desde el panel)
  for (const [i, b] of [["branch-1", "Sucursal 1"], ["branch-2", "Sucursal 2"]].entries()) {
    await prisma.branch.upsert({ where: { id: b[0] }, update: {}, create: { id: b[0], name: b[1], sortOrder: i + 1 } });
  }
  // Ventas y citas anteriores a las sucursales pasan a la Sucursal 1
  await prisma.sale.updateMany({ where: { branchId: null }, data: { branchId: "branch-1" } });
  await prisma.appointment.updateMany({ where: { branchId: null }, data: { branchId: "branch-1" } });

  // Servicios de ejemplo (precios DEMO en centavos: Q50.00, Q35.00, Q80.00)
  const services = [
    { id: "svc-corte", name: "Corte de cabello", priceCents: 5000, sortOrder: 1,
      description: "Corte a tu estilo, con lavado y acabado." },
    { id: "svc-barba", name: "Corte de barba", priceCents: 3500, sortOrder: 2,
      description: "Perfilado y arreglo de barba con toalla caliente." },
    { id: "svc-combo", name: "Corte de cabello + barba", priceCents: 8000, sortOrder: 3,
      description: "El servicio completo en una sola cita." },
  ];
  for (const s of services) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: {},
      create: { ...s, durationMinutes: 50 },
    });
  }

  // Administrador inicial
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (email && password) {
    await prisma.user.upsert({
      where: { email: email.toLowerCase() },
      update: {},
      create: {
        name: "Administrador",
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
  } else {
    console.warn("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD no definidos: no se creó administrador.");
  }

  // Propietario de la plataforma (opcional): cuenta del desarrollador, con rol ADMIN
  const ownerEmail = (process.env.PLATFORM_OWNER_EMAILS ?? "").split(",")[0]?.trim().toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  if (ownerEmail && ownerPassword) {
    await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        name: "Propietario",
        email: ownerEmail,
        passwordHash: await bcrypt.hash(ownerPassword, 12),
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
  }

  // Barbero de demostración, lunes a sábado 9:00–13:00 y 14:00–18:00
  const barber = await prisma.barber.upsert({
    where: { id: "demo-barber-1" },
    update: {},
    create: { id: "demo-barber-1", displayName: "Barbero Demo", bio: "Perfil de demostración." },
  });
  await prisma.workingHours.deleteMany({ where: { barberId: barber.id } });
  const blocks = [[9 * 60, 13 * 60], [14 * 60, 18 * 60]];
  await prisma.workingHours.createMany({
    data: [1, 2, 3, 4, 5, 6].flatMap((weekday) =>
      blocks.map(([startMinute, endMinute]) => ({
        barberId: barber.id, weekday, startMinute, endMinute,
      })),
    ),
  });

  console.log("Seed completado.");
}

main().finally(() => prisma.$disconnect());
