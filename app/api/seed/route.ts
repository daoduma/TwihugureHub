// app/api/seed/route.ts
//
// ONE-TIME SEED ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO USE:
//   1. Add this file to your repo at:  app/api/seed/route.ts
//   2. Add this env variable in Vercel: SEED_SECRET=some-long-random-string
//   3. Deploy to Vercel
//   4. Hit the endpoint once:
//        curl -X POST https://your-app.vercel.app/api/seed \
//          -H "Content-Type: application/json" \
//          -d '{"secret":"some-long-random-string"}'
//   5. You should get: { "ok": true, "message": "Seed complete" }
//   6. IMPORTANT: Delete SEED_SECRET from Vercel env vars after seeding.
//      This permanently disables the endpoint.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { PrismaClient, Role, Language, CourseStatus, LLMProvider, FlagType, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function encryptForSeed(plaintext: string): string {
  const secret = process.env.ENCRYPTION_SECRET || "00000000000000000000000000000000";
  const key = crypto.createHash("sha256").update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function nanoidSimple(len = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export async function POST(req: Request) {
  // ── Guard: endpoint is disabled if SEED_SECRET is not set ──
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) {
    return NextResponse.json({ error: "Seed endpoint is disabled" }, { status: 403 });
  }

  // ── Guard: require the correct secret in the request body ──
  const body = await req.json().catch(() => ({}));
  if (body.secret !== seedSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  try {
    const log: string[] = [];

    // ── 1. ADMIN ──────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("Admin@1234", 12);
    const admin = await prisma.user.upsert({
      where: { email: "admin@twihugurehub.rw" },
      update: {},
      create: {
        name: "System Admin",
        email: "admin@twihugurehub.rw",
        passwordHash: adminHash,
        role: Role.ADMIN,
        preferredLanguage: Language.en,
      },
    });
    log.push(`✅ Admin: ${admin.email}`);

    // ── 2. TRAINERS ───────────────────────────────────────────────────────────
    const trainerHash = await bcrypt.hash("Trainer@1234", 12);
    const trainer1 = await prisma.user.upsert({
      where: { email: "trainer1@twihugurehub.rw" },
      update: {},
      create: {
        name: "Marie Uwimana",
        email: "trainer1@twihugurehub.rw",
        passwordHash: trainerHash,
        role: Role.TRAINER,
        preferredLanguage: Language.fr,
      },
    });
    const trainer2 = await prisma.user.upsert({
      where: { email: "trainer2@twihugurehub.rw" },
      update: {},
      create: {
        name: "John Mugisha",
        email: "trainer2@twihugurehub.rw",
        passwordHash: trainerHash,
        role: Role.TRAINER,
        preferredLanguage: Language.en,
      },
    });
    log.push(`✅ Trainers: ${trainer1.email}, ${trainer2.email}`);

    // ── 3. MBAZA STAFF ────────────────────────────────────────────────────────
    const mbazaHash = await bcrypt.hash("Mbaza@1234", 12);
    const mbaza = await prisma.user.upsert({
      where: { email: "mbaza@twihugurehub.rw" },
      update: {},
      create: {
        name: "Aline Ingabire",
        email: "mbaza@twihugurehub.rw",
        passwordHash: mbazaHash,
        role: Role.MBAZA_STAFF,
        preferredLanguage: Language.en,
      },
    });
    log.push(`✅ Mbaza Staff: ${mbaza.email}`);

    // ── 4. FARMERS ────────────────────────────────────────────────────────────
    const farmerData = [
      { name: "Innocent Nkurunziza",   email: "farmer1@twihugurehub.rw",  lang: Language.rw },
      { name: "Esperance Mukamana",    email: "farmer2@twihugurehub.rw",  lang: Language.rw },
      { name: "Claude Hakizimana",     email: "farmer3@twihugurehub.rw",  lang: Language.fr },
      { name: "Vestine Uwase",         email: "farmer4@twihugurehub.rw",  lang: Language.rw },
      { name: "Eric Ntawukuliryayo",   email: "farmer5@twihugurehub.rw",  lang: Language.en },
      { name: "Diane Mukanziza",       email: "farmer6@twihugurehub.rw",  lang: Language.fr },
      { name: "Patrick Habimana",      email: "farmer7@twihugurehub.rw",  lang: Language.rw },
      { name: "Solange Uwimana",       email: "farmer8@twihugurehub.rw",  lang: Language.en },
      { name: "Gilbert Niyonzima",     email: "farmer9@twihugurehub.rw",  lang: Language.fr },
      { name: "Agnes Mukagasana",      email: "farmer10@twihugurehub.rw", lang: Language.rw },
    ];
    const farmerHash = await bcrypt.hash("Farmer@1234", 12);
    await Promise.all(
      farmerData.map((f) =>
        prisma.user.upsert({
          where: { email: f.email },
          update: {},
          create: {
            name: f.name,
            email: f.email,
            passwordHash: farmerHash,
            role: Role.FARMER,
            preferredLanguage: f.lang,
          },
        })
      )
    );
    log.push(`✅ Farmers: ${farmerData.length} users`);

    // ── 5. LLM CONFIG (Groq via OpenAI-compatible API) ────────────────────────
    // Groq exposes an OpenAI-compatible REST API, so we use LLMProvider.CUSTOM
    // (the schema has no OPENAI_COMPATIBLE variant). The rest of the app reads
    // this row via `singleton: 1` and checks provider.toLowerCase() === "custom"
    // to route through the openai-compatible code path in translationClient.ts.
    const rawKey = process.env.AI_API_KEY ?? "";
    const encryptedKey = rawKey ? encryptForSeed(rawKey) : encryptForSeed("placeholder");
    await prisma.lLMConfig.upsert({
      where: { singleton: 1 },
      update: {},
      create: {
        singleton: 1,
        // FIX: use LLMProvider.CUSTOM — the enum has no OPENAI_COMPATIBLE value.
        // translationClient.ts already handles "custom" as the openai-compatible
        // provider by reading baseUrl and calling the OpenAI SDK against it.
        provider: LLMProvider.CUSTOM,
        modelId: process.env.AI_MODEL ?? "llama-3.3-70b-versatile",
        baseUrl: process.env.AI_BASE_URL ?? "https://api.groq.com/openai/v1",
        apiKey: encryptedKey,
        isActive: true,
      },
    });
    log.push("✅ LLM config (Groq / CUSTOM provider)");

    // ── 6. SAMPLE COURSE ──────────────────────────────────────────────────────
    const existingCourse = await prisma.course.findFirst({
      where: { trainerId: trainer1.id },
    });

    if (!existingCourse) {
      const course = await prisma.course.create({
        data: {
          title: {
            en: "Introduction to Sustainable Farming",
            fr: "Introduction à l'agriculture durable",
            rw: "Intangiriro y'ubuhinzi burambye",
          },
          description: {
            en: "Learn the fundamentals of sustainable agricultural practices for Rwandan farmers.",
            fr: "Apprenez les fondamentaux des pratiques agricoles durables.",
            rw: "Menya ibipande by'ubuhinzi burambye ku bahinzi bo mu Rwanda.",
          },
          trainerId: trainer1.id,
          status: CourseStatus.PUBLISHED,
        },
      });

      const module1 = await prisma.module.create({
        data: {
          courseId: course.id,
          title: {
            en: "Soil Health Basics",
            fr: "Bases de la santé des sols",
            rw: "Ibipande by'ubuzima bw'ubutaka",
          },
          order: 0,
        },
      });

      await prisma.lesson.create({
        data: {
          moduleId: module1.id,
          title: {
            en: "Understanding Your Soil",
            fr: "Comprendre votre sol",
            rw: "Gusobanukirwa ubutaka bwawe",
          },
          body: {
            en: "<p>Healthy soil is the foundation of productive farming. Learn to identify soil types and improve fertility naturally.</p>",
            fr: "<p>Un sol sain est la base d'une agriculture productive.</p>",
            rw: "<p>Ubutaka buzima ni ishingiro ry'ubuhinzi bubyara umusaruro.</p>",
          },
          order: 0,
        },
      });

      log.push(`✅ Sample course: "${(course.title as { en: string }).en}"`);
    } else {
      log.push("⏭️  Sample course already exists, skipped");
    }

    await prisma.$disconnect();

    return NextResponse.json({
      ok: true,
      message: "Seed complete",
      log,
    });
  } catch (error) {
    await prisma.$disconnect();
    console.error("[Seed] Error:", error);
    return NextResponse.json(
      { error: "Seed failed", detail: String(error) },
      { status: 500 }
    );
  }
}
