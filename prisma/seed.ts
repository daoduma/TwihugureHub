// prisma/seed.ts
import { PrismaClient, Role, Language } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin
  const adminHash = await bcrypt.hash("Admin@2024!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@twihugure.rw" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@twihugure.rw",
      passwordHash: adminHash,
      role: Role.ADMIN,
      preferredLanguage: Language.rw,
    },
  });
  console.log("✅ Admin created:", admin.email);

  // Create a demo trainer
  const trainerHash = await bcrypt.hash("Trainer@2024!", 12);
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@twihugure.rw" },
    update: {},
    create: {
      name: "Demo Trainer",
      email: "trainer@twihugure.rw",
      passwordHash: trainerHash,
      role: Role.TRAINER,
      preferredLanguage: Language.fr,
    },
  });
  console.log("✅ Trainer created:", trainer.email);

  // Create a demo Mbaza staff
  const mbazaHash = await bcrypt.hash("Mbaza@2024!", 12);
  const mbaza = await prisma.user.upsert({
    where: { email: "mbaza@twihugure.rw" },
    update: {},
    create: {
      name: "Mbaza Staff Member",
      email: "mbaza@twihugure.rw",
      passwordHash: mbazaHash,
      role: Role.MBAZA_STAFF,
      preferredLanguage: Language.en,
    },
  });
  console.log("✅ Mbaza staff created:", mbaza.email);

  // Create a demo farmer
  const farmerHash = await bcrypt.hash("Farmer@2024!", 12);
  const farmer = await prisma.user.upsert({
    where: { email: "farmer@twihugure.rw" },
    update: {},
    create: {
      name: "Uwimana Jean",
      email: "farmer@twihugure.rw",
      passwordHash: farmerHash,
      role: Role.FARMER,
      preferredLanguage: Language.rw,
    },
  });
  console.log("✅ Farmer created:", farmer.email);

  console.log("\n🎉 Seeding complete!");
  console.log("\nDemo credentials:");
  console.log("  Admin:       admin@twihugure.rw    / Admin@2024!");
  console.log("  Trainer:     trainer@twihugure.rw  / Trainer@2024!");
  console.log("  Mbaza Staff: mbaza@twihugure.rw    / Mbaza@2024!");
  console.log("  Farmer:      farmer@twihugure.rw   / Farmer@2024!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
