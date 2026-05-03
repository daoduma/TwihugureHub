// prisma/seed.ts
// CHANGED: Complete rewrite with all required seed data per spec
import { PrismaClient, Role, Language, CourseStatus, LLMProvider, FlagType, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Minimal encrypt for seed (avoid circular dep)
function encryptForSeed(plaintext: string): string {
  const crypto = require("crypto");
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

async function main() {
  console.log("🌱 Seeding TwihugureHub database...");

  // ── 1. ADMIN USER ──────────────────────────────────────────────────────────
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
  console.log("✅ Admin:", admin.email);

  // ── 2. TRAINER USERS ───────────────────────────────────────────────────────
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
  console.log("✅ Trainers:", trainer1.email, trainer2.email);

  // ── 3. MBAZA STAFF ─────────────────────────────────────────────────────────
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
  console.log("✅ Mbaza Staff:", mbaza.email);

  // ── 4. FARMER USERS (10) ───────────────────────────────────────────────────
  const farmerData = [
    { name: "Innocent Nkurunziza",      email: "farmer1@twihugurehub.rw",  lang: Language.rw },
    { name: "Esperance Mukamana",       email: "farmer2@twihugurehub.rw",  lang: Language.rw },
    { name: "Claude Hakizimana",        email: "farmer3@twihugurehub.rw",  lang: Language.fr },
    { name: "Vestine Uwase",            email: "farmer4@twihugurehub.rw",  lang: Language.rw },
    { name: "Eric Ntawukuliryayo",      email: "farmer5@twihugurehub.rw",  lang: Language.en },
    { name: "Diane Mukanziza",          email: "farmer6@twihugurehub.rw",  lang: Language.fr },
    { name: "Patrick Habimana",         email: "farmer7@twihugurehub.rw",  lang: Language.rw },
    { name: "Solange Uwimana",          email: "farmer8@twihugurehub.rw",  lang: Language.en },
    { name: "Gilbert Niyonzima",        email: "farmer9@twihugurehub.rw",  lang: Language.fr },
    { name: "Agnes Mukagasana",         email: "farmer10@twihugurehub.rw", lang: Language.rw },
  ];
  const farmerHash = await bcrypt.hash("Farmer@1234", 12);
  const farmers = await Promise.all(
    farmerData.map((f) =>
      prisma.user.upsert({
        where: { email: f.email },
        update: {},
        create: {
          name: f.name, email: f.email,
          passwordHash: farmerHash,
          role: Role.FARMER,
          preferredLanguage: f.lang,
        },
      })
    )
  );
  console.log("✅ Farmers created:", farmers.length);

  // ── 5. COURSE 1: Soil Health & Composting ─────────────────────────────────
  const course1 = await prisma.course.create({
    data: {
      title: {
        en: "Soil Health & Composting",
        fr: "Santé du sol et compostage",
        rw: "Ubuzima bw'ubutaka n'imborera",
      },
      description: {
        en: "Learn essential techniques for maintaining healthy soil and creating effective compost for sustainable agriculture.",
        fr: "Apprenez les techniques essentielles pour maintenir un sol sain et créer du compost efficace pour une agriculture durable.",
        rw: "Menya uburyo bwiza bwo kubungabunga ubutaka buzima no gukora imborera inoze mu buhinzi burambye.",
      },
      trainerId: trainer1.id,
      status: CourseStatus.PUBLISHED,
      availableLanguages: ["en", "fr", "rw"],
    },
  });

  // Helper to create a module with lessons and quizzes
  async function createModule(courseId: string, title: any, order: number, lessonDefs: any[]) {
    const mod = await prisma.module.create({ data: { courseId, title, order } });
    for (const ld of lessonDefs) {
      const lesson = await prisma.lesson.create({
        data: { moduleId: mod.id, title: ld.title, body: ld.body, order: ld.order },
      });
      if (ld.quiz) {
        const quiz = await prisma.quiz.create({
          data: { lessonId: lesson.id, title: ld.quiz.title, passingScore: 70, allowRetry: true },
        });
        for (let qi = 0; qi < ld.quiz.questions.length; qi++) {
          const qd = ld.quiz.questions[qi];
          const question = await prisma.question.create({
            data: {
              quizId: quiz.id, type: "MULTIPLE_CHOICE", stem: qd.stem, order: qi + 1,
              translationStatus: { en: "MANUAL", fr: "MANUAL", rw: "MANUAL" },
            },
          });
          for (const opt of qd.options) {
            await prisma.answerOption.create({
              data: { questionId: question.id, text: opt.text, isCorrect: opt.isCorrect, order: opt.order },
            });
          }
          await prisma.questionFeedback.create({
            data: { questionId: question.id, correctFeedback: qd.cf, incorrectFeedback: qd.if },
          });
        }
      }
    }
    return mod;
  }

  // Course 1 - Module 1
  await createModule(course1.id,
    { en: "Understanding Soil Composition", fr: "Comprendre la composition du sol", rw: "Gusobanukirwa imikoreshereze y'ubutaka" },
    1,
    [
      {
        title: { en: "Soil Types and Structures", fr: "Types et structures du sol", rw: "Ubwoko n'imiterere y'ubutaka" },
        body: { en: "<p>Soil is a complex mixture of minerals, organic matter, water, air, and countless organisms. Sandy soils drain quickly but lose nutrients fast. Clay soils retain water and nutrients. Loam — a mix of sand, silt, and clay — is ideal for most crops.</p>", fr: "<p>Le sol est un mélange complexe de minéraux, de matière organique, d'eau et d'organismes. Le sol sableux se draine rapidement. Le sol argileux retient l'eau. Le limon est idéal.</p>", rw: "<p>Ubutaka ni uruvange rwa minerale, ibintu byavuye mu binyabuzima, amazi, umwuka, n'ibikorwa. Ubutaka bw'ibyondo bumena amazi vuba. Ubutaka bw'ibirare bufata amazi.</p>" },
        order: 1,
        quiz: {
          title: { en: "Soil Types Quiz", fr: "Quiz types de sol", rw: "Ikizamini cy'ubwoko bw'ubutaka" },
          questions: [
            {
              stem: { en: "Which soil type retains water and nutrients best?", fr: "Quel type de sol retient le mieux l'eau et les nutriments?", rw: "Ni ubwoko bw'ubutaka ki bufata neza amazi n'ibitera imikurire?" },
              options: [
                { text: { en: "Sandy soil", fr: "Sol sableux", rw: "Ubutaka bw'ibyondo" }, isCorrect: false, order: 1 },
                { text: { en: "Clay soil", fr: "Sol argileux", rw: "Ubutaka bw'ibirare" }, isCorrect: true, order: 2 },
                { text: { en: "Gravel soil", fr: "Sol graveleux", rw: "Ubutaka bw'amashyuza" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Correct! Clay particles hold water and nutrients due to their small size and high surface area.", fr: "Correct! Les particules d'argile retiennent l'eau grâce à leur petite taille.", rw: "Nibyo! Ibirare bifata amazi n'ibitera imikurire." },
              if: { en: "Think about which soil is heaviest when wet.", fr: "Pensez à quel sol est le plus lourd quand il est mouillé.", rw: "Tekereza ubutaka bukabije iyo bufite amazi." },
            },
            {
              stem: { en: "What is loam soil composed of?", fr: "De quoi est composé le sol limoneux?", rw: "Ubutaka bwa loam bugizwe n'iki?" },
              options: [
                { text: { en: "Sand, silt, and clay", fr: "Sable, limon et argile", rw: "Ibyondo, isaho, n'ibirare" }, isCorrect: true, order: 1 },
                { text: { en: "Only sand and clay", fr: "Seulement sable et argile", rw: "Ibyondo n'ibirare gusa" }, isCorrect: false, order: 2 },
                { text: { en: "Clay and gravel", fr: "Argile et gravier", rw: "Ibirare n'amashyuza" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Excellent! Loam contains sand, silt, and clay — the ideal combination.", fr: "Excellent! Le limon contient sable, limon et argile.", rw: "Ni byiza! Loam ifite ibyondo, isaho, n'ibirare." },
              if: { en: "Loam contains three main components.", fr: "Le limon contient trois composants.", rw: "Loam ifite ibice bitatu." },
            },
            {
              stem: { en: "What is the main disadvantage of sandy soil?", fr: "Quel est le principal inconvénient du sol sableux?", rw: "Ni ikihe kibazo kinini cy'ubutaka bw'ibyondo?" },
              options: [
                { text: { en: "It drains quickly and loses nutrients", fr: "Il se draine et perd les nutriments", rw: "Amazi asohoka kandi ibitera imikurire birahunguka" }, isCorrect: true, order: 1 },
                { text: { en: "It becomes waterlogged", fr: "Il se gorge d'eau", rw: "Ugabanuka ubwaguke ku mazi" }, isCorrect: false, order: 2 },
                { text: { en: "It is too heavy", fr: "Il est trop lourd", rw: "Ubufite uburemere bwinshi" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Correct! Sandy soil's large particles mean water and nutrients drain away quickly.", fr: "Correct! Le sol sableux perd l'eau et les nutriments rapidement.", rw: "Nibyo! Ubutaka bw'ibyondo bumena amazi n'ibitera imikurire vuba." },
              if: { en: "Think about how water moves through sand.", fr: "Pensez à comment l'eau se déplace dans le sable.", rw: "Tekereza uko amazi ahita mu ibyondo." },
            },
          ],
        },
      },
      {
        title: { en: "Soil pH and Nutrients", fr: "pH du sol et nutriments", rw: "pH y'ubutaka n'ibitera imikurire" },
        body: { en: "<p>Soil pH measures acidity or alkalinity (0–14 scale). Most crops prefer pH 6.0–7.0. Essential nutrients: Nitrogen (N), Phosphorus (P), Potassium (K) — NPK. Test your soil to identify deficiencies.</p>", fr: "<p>Le pH du sol mesure l'acidité ou l'alcalinité (échelle 0–14). La plupart des cultures préfèrent un pH de 6,0 à 7,0. Nutriments essentiels: NPK.</p>", rw: "<p>pH y'ubutaka ipima ubunounours (0-14). Imyaka myinshi ikunda pH 6.0-7.0. Ibitera imikurire by'ingenzi: NPK.</p>" },
        order: 2,
        quiz: {
          title: { en: "Soil pH Quiz", fr: "Quiz pH du sol", rw: "Ikizamini cya pH" },
          questions: [
            {
              stem: { en: "What pH range do most crops prefer?", fr: "Quelle plage de pH la plupart des cultures préfèrent-elles?", rw: "Imyaka myinshi ikunda pH iri mu ntera iyihe?" },
              options: [
                { text: { en: "6.0 – 7.0", fr: "6,0 – 7,0", rw: "6.0 – 7.0" }, isCorrect: true, order: 1 },
                { text: { en: "3.0 – 4.5", fr: "3,0 – 4,5", rw: "3.0 – 4.5" }, isCorrect: false, order: 2 },
                { text: { en: "8.0 – 9.5", fr: "8,0 – 9,5", rw: "8.0 – 9.5" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Perfect! pH 6.0–7.0 is ideal for nutrient availability.", fr: "Parfait! Le pH 6,0–7,0 est idéal.", rw: "Ni byiza! PH 6.0-7.0 ni nziza." },
              if: { en: "Review the soil pH section.", fr: "Revoyez la section pH.", rw: "Subiramo igice cya pH." },
            },
            {
              stem: { en: "What does NPK stand for?", fr: "Que signifie NPK?", rw: "NPK bivuze iki?" },
              options: [
                { text: { en: "Nitrogen, Phosphorus, Potassium", fr: "Azote, Phosphore, Potassium", rw: "Azote, Fosifor, Potasiyumu" }, isCorrect: true, order: 1 },
                { text: { en: "Nitrogen, Potash, Krypton", fr: "Azote, Potasse, Krypton", rw: "Azote, Potasse, Krypton" }, isCorrect: false, order: 2 },
                { text: { en: "Natural, Pure, Kind", fr: "Naturel, Pur, Gentil", rw: "Kamere, Isukuruye, Nziza" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Correct! Nitrogen, Phosphorus, and Potassium are the three primary macronutrients.", fr: "Correct! Azote, Phosphore et Potassium sont les trois macronutriments primaires.", rw: "Nibyo! Azote, Fosifor, na Potasiyumu ni ibitera imikurire by'ingenzi bitatu." },
              if: { en: "These are the key elements plants need from soil.", fr: "Ce sont les éléments clés dont les plantes ont besoin.", rw: "Izo ni ngano z'ibanze ibimera bisabira mu butaka." },
            },
            {
              stem: { en: "How can you raise the pH of acidic soil?", fr: "Comment augmenter le pH d'un sol acide?", rw: "Ni gute washyira hejuru pH y'ubutaka bw'ibunounours?" },
              options: [
                { text: { en: "Add lime (calcium carbonate)", fr: "Ajouter de la chaux", rw: "Ongeraho kalimu" }, isCorrect: true, order: 1 },
                { text: { en: "Add sulfur", fr: "Ajouter du soufre", rw: "Ongeraho sulfure" }, isCorrect: false, order: 2 },
                { text: { en: "Add more water", fr: "Ajouter plus d'eau", rw: "Ongeraho amazi menshi" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Correct! Agricultural lime neutralizes acidic soil.", fr: "Correct! La chaux agricole neutralise le sol acide.", rw: "Nibyo! Kalimu y'ubuhinzi ituza ubutaka bw'ibunounours." },
              if: { en: "Lime is a base that neutralizes acids.", fr: "La chaux est une base qui neutralise les acides.", rw: "Kalimu ni ibaze ishira ibunounours." },
            },
          ],
        },
      },
      {
        title: { en: "Soil Conservation Practices", fr: "Pratiques de conservation des sols", rw: "Imigenzereze yo kubungabunga ubutaka" },
        body: { en: "<p>Soil conservation prevents erosion. Key practices: contour farming, terracing, cover crops, minimum tillage. On hilly Rwandan terrain, contour plowing dramatically reduces runoff and topsoil loss.</p>", fr: "<p>La conservation des sols prévient l'érosion. Pratiques clés: agriculture en courbes de niveau, terrasses, cultures de couverture.</p>", rw: "<p>Kubungabunga ubutaka birinda gusenyuka. Imigenzereze y'ingenzi: ubuhinzi bw'imirongo, ibibuga, imyaka y'ikwirakwizwa.</p>" },
        order: 3,
        quiz: {
          title: { en: "Soil Conservation Quiz", fr: "Quiz conservation des sols", rw: "Ikizamini cyo kubungabunga ubutaka" },
          questions: [
            {
              stem: { en: "Which practice is most effective at reducing soil erosion on slopes?", fr: "Quelle pratique réduit le mieux l'érosion sur les pentes?", rw: "Ni izihe mikorere inaniye mu guhaza gusenyuka kw'ubutaka ku gasozi?" },
              options: [
                { text: { en: "Contour farming and terracing", fr: "Agriculture en courbes de niveau et terrasses", rw: "Ubuhinzi bw'imirongo n'ibibuga" }, isCorrect: true, order: 1 },
                { text: { en: "Deep plowing", fr: "Labour profond", rw: "Gucunga cyane" }, isCorrect: false, order: 2 },
                { text: { en: "Burning crop residues", fr: "Brûler les résidus", rw: "Gutwika imyidagaduro" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Excellent! Contour farming and terracing reduce water flow and prevent topsoil loss.", fr: "Excellent! L'agriculture en courbes réduit l'écoulement et prévient la perte de sol.", rw: "Ni byiza! Ubuhinzi bw'imirongo n'ibibuga bigabanya amazi kandi birinda ubutaka guhunga." },
              if: { en: "Think about how water flows downhill.", fr: "Pensez à comment l'eau coule vers le bas.", rw: "Tekereza uko amazi asiba amanuka." },
            },
            {
              stem: { en: "What is the main benefit of cover crops?", fr: "Quel est le principal avantage des cultures de couverture?", rw: "Ni ikihe nyungu nkuru y'imyaka y'ikwirakwizwa?" },
              options: [
                { text: { en: "They protect and enrich the soil", fr: "Elles protègent et enrichissent le sol", rw: "Zirinda no kuzuza ubutaka" }, isCorrect: true, order: 1 },
                { text: { en: "They repel all insects", fr: "Elles repoussent tous les insectes", rw: "Zihashya inzoka zose" }, isCorrect: false, order: 2 },
                { text: { en: "They require no water", fr: "Elles ne nécessitent pas d'eau", rw: "Nzibutswa amazi" }, isCorrect: false, order: 3 },
              ],
              cf: { en: "Correct! Cover crops protect soil from erosion and add organic matter.", fr: "Correct! Les cultures de couverture protègent le sol et ajoutent de la matière organique.", rw: "Nibyo! Imyaka y'ikwirakwizwa irinda ubutaka kandi yongeraho ibintu byavuye mu binyabuzima." },
              if: { en: "Cover crops play a protective and nutritive role.", fr: "Les cultures de couverture jouent un rôle protecteur et nutritif.", rw: "Imyaka y'ikwirakwizwa ikora umurimo wo kurinda no gutunga." },
            },
            {
              stem: { en: "True or False: Burning crop residues is good for long-term soil health.", fr: "Vrai ou Faux: Brûler les résidus est bon pour la santé du sol à long terme?", rw: "Ukuri cyangwa Ikinyoma: Gutwika imyidagaduro ni byiza ku buzima bw'ubutaka?" },
              options: [
                { text: { en: "True", fr: "Vrai", rw: "Ukuri" }, isCorrect: false, order: 1 },
                { text: { en: "False", fr: "Faux", rw: "Ikinyoma" }, isCorrect: true, order: 2 },
              ],
              cf: { en: "Correct! Burning destroys organic matter and beneficial microorganisms.", fr: "Correct! Le brûlage détruit la matière organique et les micro-organismes.", rw: "Nibyo! Gutwika birimbura ibintu byavuye mu binyabuzima n'ibikorwa by'ingirakamaro." },
              if: { en: "Burning removes valuable organic matter.", fr: "Le brûlage supprime la matière organique précieuse.", rw: "Gutwika bivanaho ibintu by'agaciro byavuye mu binyabuzima." },
            },
          ],
        },
      },
    ]
  );

  // Course 1 - Module 2 & 3 (simplified)
  await createModule(course1.id,
    { en: "Composting Fundamentals", fr: "Fondamentaux du compostage", rw: "Ibanze by'imborera" },
    2,
    [
      { title: { en: "What is Compost and Why It Matters", fr: "Qu'est-ce que le compost", rw: "Imborera ni iki" }, body: { en: "<p>Compost is decomposed organic matter that improves soil structure, adds nutrients, and supports beneficial microorganisms. Well-made compost replaces chemical fertilizers and improves water retention.</p>", fr: "<p>Le compost est de la matière organique décomposée qui améliore la structure du sol.</p>", rw: "<p>Imborera ni ibintu byavuye mu binyabuzima byononekaye binoze ubutaka.</p>" }, order: 1, quiz: { title: { en: "Compost Basics Quiz", fr: "Quiz de base compost", rw: "Ikizamini cy'ibanze by'imborera" }, questions: [{ stem: { en: "What is compost made from?", fr: "De quoi est fait le compost?", rw: "Imborera ikozwe n'iki?" }, options: [{ text: { en: "Decomposed organic matter", fr: "Matière organique décomposée", rw: "Ibintu byavuye mu binyabuzima byononekaye" }, isCorrect: true, order: 1 }, { text: { en: "Chemical fertilizers", fr: "Engrais chimiques", rw: "Ifumbire y'imiti" }, isCorrect: false, order: 2 }, { text: { en: "Mined minerals", fr: "Minéraux extraits", rw: "Minerale yavuwemo" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Compost is organic material broken down by microorganisms.", fr: "Correct! Le compost est de la matière organique décomposée par des micro-organismes.", rw: "Nibyo! Imborera ni ibintu byavuye mu binyabuzima byanononekajwe n'agakarabo." }, if: { en: "Compost comes from organic materials like food scraps and leaves.", fr: "Le compost vient de matières organiques.", rw: "Imborera ivuye ibintu byavuye mu binyabuzima." } }, { stem: { en: "Which can be added to a compost pile?", fr: "Lequel peut être ajouté à un tas de compost?", rw: "Ni ikihe bishobora kongerwa ku mborera?" }, options: [{ text: { en: "Vegetable peels", fr: "Épluchures de légumes", rw: "Ibikangara by'imboga" }, isCorrect: true, order: 1 }, { text: { en: "Meat and fish scraps", fr: "Restes de viande et poisson", rw: "Imyidagaduro y'inyama n'ifi" }, isCorrect: false, order: 2 }, { text: { en: "Plastic packaging", fr: "Emballages plastiques", rw: "Plastike" }, isCorrect: false, order: 3 }], cf: { en: "Perfect! Vegetable scraps add nitrogen to compost.", fr: "Parfait! Les épluchures ajoutent de l'azote.", rw: "Ni byiza! Ibikangara by'imboga bishyiraho azote." }, if: { en: "Only organic plant-based materials.", fr: "Seulement les matières organiques végétales.", rw: "Ibintu byavuye mu binyabuzima gusa." } }, { stem: { en: "What role do microorganisms play in composting?", fr: "Quel rôle jouent les micro-organismes?", rw: "Ni uwuhe murimo agakarabo kagira?" }, options: [{ text: { en: "They break down organic matter into nutrients", fr: "Ils décomposent la matière organique en nutriments", rw: "Anonoeka ibintu bikabigira ibitera imikurire" }, isCorrect: true, order: 1 }, { text: { en: "They slow decomposition", fr: "Ils ralentissent la décomposition", rw: "Agabanya gukonjora" }, isCorrect: false, order: 2 }, { text: { en: "They harm the compost", fr: "Ils nuisent au compost", rw: "Angirira imborera" }, isCorrect: false, order: 3 }], cf: { en: "Exactly! Bacteria and fungi turn waste into nutrients.", fr: "Exactement! Les bactéries et champignons transforment les déchets.", rw: "Nibyo! Bagiteri n'ubunyobwa bigahindura imyidagaduro mu bitera imikurire." }, if: { en: "Without microorganisms, organic materials would not decompose.", fr: "Sans micro-organismes, les matières organiques ne se décomposeraient pas.", rw: "Nta gakarabo, ibintu ntibizanonoekwa." } }] } },
      { title: { en: "Building a Compost Pile", fr: "Construire un tas de compost", rw: "Kubaka umupira w'imborera" }, body: { en: "<p>Alternate 'green' (nitrogen-rich) and 'brown' (carbon-rich) layers. Greens: kitchen scraps, fresh manure. Browns: dry leaves, straw. Keep moist like a wrung sponge and turn weekly.</p>", fr: "<p>Alternez couches vertes et brunes. Maintenez humide et retournez hebdomadairement.</p>", rw: "<p>Sanya amababa y'icyatsi n'ay'ibara ry'isuri. Bubike hafi amazi kandi ubivugurure buri cyumweru.</p>" }, order: 2, quiz: { title: { en: "Compost Building Quiz", fr: "Quiz construction compost", rw: "Ikizamini cyo kubaka imborera" }, questions: [{ stem: { en: "What are 'brown' materials in composting?", fr: "Que sont les matériaux bruns?", rw: "Ni ibiki ibintu by'ibara ry'isuri?" }, options: [{ text: { en: "Dry leaves and straw", fr: "Feuilles sèches et paille", rw: "Amashami yumye n'inshishi" }, isCorrect: true, order: 1 }, { text: { en: "Fresh grass clippings", fr: "Tontes de gazon fraîches", rw: "Ubwatsi bwatontse bushya" }, isCorrect: false, order: 2 }, { text: { en: "Kitchen vegetable scraps", fr: "Restes de légumes", rw: "Imyidagaduro y'imboga" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Brown materials are carbon-rich and create airflow.", fr: "Correct! Les matières brunes sont riches en carbone.", rw: "Nibyo! Ibintu by'ibara ry'isuri bifite carbone menshi." }, if: { en: "Think about dry, carbon-rich materials.", fr: "Pensez aux matières sèches riches en carbone.", rw: "Tekereza ibintu byumye kandi birimo carbone." } }, { stem: { en: "How moist should a compost pile be?", fr: "À quel point humide doit être un tas de compost?", rw: "Umupira w'imborera ugomba kuba ufite amazi angana gute?" }, options: [{ text: { en: "Like a wrung-out sponge", fr: "Comme une éponge essorée", rw: "Nk'isipunji imyeyemo" }, isCorrect: true, order: 1 }, { text: { en: "Completely dry", fr: "Complètement sec", rw: "Yumye cyane" }, isCorrect: false, order: 2 }, { text: { en: "Soaking wet", fr: "Trempé", rw: "Ifite amazi menshi" }, isCorrect: false, order: 3 }], cf: { en: "Perfect! Too dry slows decomposition; too wet causes bad smells.", fr: "Parfait! Trop sec ralentit; trop mouillé cause de mauvaises odeurs.", rw: "Ni byiza! Bikabije gukauka bikabangamira gukonjora." }, if: { en: "Compost microorganisms need moisture but not waterlogged conditions.", fr: "Les micro-organismes ont besoin d'humidité mais pas d'inondation.", rw: "Agakarabo gasaba amazi ariko hatakirukaho amazi menshi." } }, { stem: { en: "Why should you turn a compost pile regularly?", fr: "Pourquoi retourner régulièrement un tas de compost?", rw: "Ni iki gituma ugomba guhinduranya umupira w'imborera?" }, options: [{ text: { en: "To introduce oxygen and speed decomposition", fr: "Pour introduire de l'oxygène et accélérer la décomposition", rw: "Kugirango winjize umwuka kandi wahaze gukonjora" }, isCorrect: true, order: 1 }, { text: { en: "To add more water", fr: "Pour ajouter plus d'eau", rw: "Kugirango wongere amazi" }, isCorrect: false, order: 2 }, { text: { en: "To cool down the pile", fr: "Pour refroidir le tas", rw: "Kugirango uhangashe umupira" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Oxygen fuels aerobic bacteria that decompose material quickly.", fr: "Correct! L'oxygène alimente les bactéries aérobies.", rw: "Nibyo! Umwuka utera bagiteri zonooka vuba ibintu." }, if: { en: "Turning introduces fresh oxygen to energize decomposers.", fr: "Le retournement introduit de l'oxygène frais.", rw: "Guhinduranya winjiza umwuka mushya." } }] } },
      { title: { en: "Using Compost in Your Garden", fr: "Utiliser le compost dans votre jardin", rw: "Gukoresha imborera mu murima wawe" }, body: { en: "<p>Finished compost is dark, crumbly, and earthy-smelling. Apply 2–4 inches to beds, work into top 6 inches of soil. Compost tea is an excellent liquid fertilizer.</p>", fr: "<p>Le compost terminé est sombre et friable. Appliquez 5 à 10 cm sur les parterres.</p>", rw: "<p>Imborera irangiye ifite isura nziza y'ibara y'ubutaka. Shyira santimetero 5-10 ku turere tw'imboga.</p>" }, order: 3, quiz: { title: { en: "Compost Application Quiz", fr: "Quiz application compost", rw: "Ikizamini cyo gukoresha imborera" }, questions: [{ stem: { en: "What does finished compost look and smell like?", fr: "À quoi ressemble le compost terminé?", rw: "Imborera irangiye igaragara ite?" }, options: [{ text: { en: "Dark, crumbly, with an earthy smell", fr: "Sombre, friable, avec odeur de terre", rw: "Irihaba, inonanana, inyamirira nk'ubutaka" }, isCorrect: true, order: 1 }, { text: { en: "Smells bad and is slimy", fr: "Sent mauvais et est visqueux", rw: "Inyamirira nabi kandi ikamira" }, isCorrect: false, order: 2 }, { text: { en: "Bright white and powdery", fr: "Blanc vif et poudreux", rw: "Yera cyane kandi ifite ufu" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Finished compost resembles dark, rich garden soil.", fr: "Correct! Le compost ressemble à un sol de jardin riche.", rw: "Nibyo! Imborera irangiye ingana nk'ubutaka bw'ingirakamaro." }, if: { en: "Ready compost has no identifiable scraps and smells like forest soil.", fr: "Le compost prêt sent comme le sol forestier.", rw: "Imborera irangiye inyamirira nk'ubutaka bw'ishyamba." } }, { stem: { en: "How deep should you work compost into soil?", fr: "À quelle profondeur incorporer le compost?", rw: "Ni ndefu kangahe ugomba gukoreza imborera mu butaka?" }, options: [{ text: { en: "6 inches (15 cm)", fr: "15 cm de profondeur", rw: "Santimetero 15 ku nzigiriko" }, isCorrect: true, order: 1 }, { text: { en: "1 inch only", fr: "1 pouce seulement", rw: "Santimetero 2.5 gusa" }, isCorrect: false, order: 2 }, { text: { en: "Just leave on top", fr: "Laisser en surface", rw: "Sigarana hejuru gusa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Mixing compost into top 6 inches puts it in the root zone.", fr: "Correct! Incorporer le compost dans les 15 premiers cm.", rw: "Nibyo! Guhuza imborera n'ubutaka bwo hejuru buyinjiza mu nkuta z'imizi." }, if: { en: "Compost needs to be where roots are — the top 6 inches.", fr: "Le compost doit être là où se trouvent les racines.", rw: "Imborera igomba kuba aho imizi iri." } }, { stem: { en: "What is compost tea used for?", fr: "À quoi sert le thé de compost?", rw: "Icyayi cy'imborera gikozwaho iki?" }, options: [{ text: { en: "As a liquid fertilizer for soil", fr: "Comme engrais liquide pour le sol", rw: "Nk'ifumbire rya lisiti rishyirwa ku butaka" }, isCorrect: true, order: 1 }, { text: { en: "For drinking by farmers", fr: "Pour la consommation", rw: "Gunywa n'abahinzi" }, isCorrect: false, order: 2 }, { text: { en: "As a pesticide spray", fr: "Comme spray pesticide", rw: "Nk'umuti w'inzoka" }, isCorrect: false, order: 3 }], cf: { en: "Perfect! Compost tea delivers nutrients in liquid form.", fr: "Parfait! Le thé de compost apporte les nutriments sous forme liquide.", rw: "Ni byiza! Icyayi cy'imborera gitanga ibitera imikurire mu buryo bw'amazi." }, if: { en: "Compost tea is a liquid extract used as garden fertilizer.", fr: "Le thé de compost est un extrait liquide utilisé comme engrais.", rw: "Icyayi cy'imborera ni extract ya lisiti ikoreshwa nk'ifumbire." } }] } },
    ]
  );

  await createModule(course1.id,
    { en: "Advanced Soil Management", fr: "Gestion avancée des sols", rw: "Ubuyobozi bw'ubutaka burambye" },
    3,
    [
      { title: { en: "Intercropping for Soil Health", fr: "Culture intercalaire pour la santé des sols", rw: "Gusangira imyaka kugirango ubutaka bushimangire" }, body: { en: "<p>Intercropping improves soil biodiversity and reduces pest pressure. Legume-cereal combinations (beans with maize) fix atmospheric nitrogen, reducing fertilizer needs.</p>", fr: "<p>La culture intercalaire améliore la biodiversité et réduit les ravageurs. Les légumineuses-céréales fixent l'azote.</p>", rw: "<p>Gusangira imyaka binonosoera ubwuzu bw'ubutaka. Gusangira imbuto n'imyaka y'intobwe bifata azote y'ikirere.</p>" }, order: 1, quiz: { title: { en: "Intercropping Quiz", fr: "Quiz culture intercalaire", rw: "Ikizamini cyo gusangira imyaka" }, questions: [{ stem: { en: "Which combination best improves soil nitrogen?", fr: "Quelle combinaison améliore le mieux l'azote du sol?", rw: "Ni izihe ni nziza mu kongera azote y'ubutaka?" }, options: [{ text: { en: "Beans and maize", fr: "Haricots et maïs", rw: "Ibishyimbo n'ibigori" }, isCorrect: true, order: 1 }, { text: { en: "Maize and sweet potato", fr: "Maïs et patate douce", rw: "Ibigori n'ibijumba" }, isCorrect: false, order: 2 }, { text: { en: "Wheat and rice", fr: "Blé et riz", rw: "Ingano n'umuceri" }, isCorrect: false, order: 3 }], cf: { en: "Excellent! Beans fix atmospheric nitrogen benefiting maize.", fr: "Excellent! Les haricots fixent l'azote pour le maïs.", rw: "Ni byiza! Ibishyimbo bifata azote ikagira akamaro ku bigori." }, if: { en: "Look for a legume-cereal combination.", fr: "Cherchez une combinaison légumineuse-céréale.", rw: "Shaka uruvange rw'imbuto n'imyaka y'intobwe." } }, { stem: { en: "What is one benefit of root diversity from intercropping?", fr: "Quel est un avantage de la diversité racinaire?", rw: "Ni ikihe nyungu kimwe cy'uburyohe bw'imizi?" }, options: [{ text: { en: "Soil structure improves at multiple depths", fr: "La structure du sol s'améliore à plusieurs profondeurs", rw: "Imiterere y'ubutaka inonosoera ku nzigiriko nyinshi" }, isCorrect: true, order: 1 }, { text: { en: "All crops produce same yield", fr: "Toutes les cultures produiront le même rendement", rw: "Imyaka yose izagiranaho imyaka ingana" }, isCorrect: false, order: 2 }, { text: { en: "Weeds grow faster", fr: "Les mauvaises herbes poussent plus vite", rw: "Ibyatsi bikura vuba" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Different root depths create channels improving drainage throughout.", fr: "Correct! Différentes profondeurs créent des canaux améliorant le drainage.", rw: "Nibyo! Inzigiriko zitandukanye z'imizi zinonoosera gusohoka kw'amazi." }, if: { en: "Think about how roots at different depths affect different soil layers.", fr: "Pensez à comment les racines affectent différentes couches.", rw: "Tekereza uko imizi igira ingaruka ku birere bitandukanye." } }, { stem: { en: "True or False: Intercropping always reduces total crop yield.", fr: "Vrai ou Faux: La culture intercalaire réduit toujours le rendement total.", rw: "Ukuri cyangwa Ikinyoma: Gusangira imyaka buri gihe bigabanya umusaruro." }, options: [{ text: { en: "True", fr: "Vrai", rw: "Ukuri" }, isCorrect: false, order: 1 }, { text: { en: "False", fr: "Faux", rw: "Ikinyoma" }, isCorrect: true, order: 2 }], cf: { en: "Correct! Intercropping often increases total land productivity.", fr: "Correct! La culture intercalaire augmente souvent la productivité.", rw: "Nibyo! Gusangira imyaka kenshi byongera umusaruro w'ubutaka." }, if: { en: "Research shows intercropping can exceed monoculture productivity.", fr: "La recherche montre que ça peut dépasser la monoculture.", rw: "Ubushakashatsi bwereka ko gusangira imyaka bishobora kurenza itera rimwe." } }] } },
      { title: { en: "Green Manure and Cover Crops", fr: "Engrais verts et cultures de couverture", rw: "Ifumbire y'icyatsi n'imyaka y'ikwirakwizwa" }, body: { en: "<p>Green manure: grow crops specifically to be turned into soil to increase organic matter. Tithonia (Mexican sunflower) is widely used in Rwanda — fast growing with high nitrogen.</p>", fr: "<p>L'engrais vert consiste à cultiver des plantes à incorporer dans le sol. Le tithonia est très populaire au Rwanda.</p>", rw: "<p>Ifumbire y'icyatsi isobanura gutera imyaka kugirango irimbukwe mu butaka. Tithonia ikoreshwa cyane mu Rwanda.</p>" }, order: 2, quiz: { title: { en: "Green Manure Quiz", fr: "Quiz engrais vert", rw: "Ikizamini cy'ifumbire y'icyatsi" }, questions: [{ stem: { en: "Why is Tithonia popular as green manure in Rwanda?", fr: "Pourquoi le Tithonia est-il populaire au Rwanda?", rw: "Ni iki gituma Tithonia ikunda mu Rwanda?" }, options: [{ text: { en: "It grows quickly and is high in nitrogen", fr: "Il pousse rapidement et est riche en azote", rw: "Ikura vuba kandi ifite azote nyinshi" }, isCorrect: true, order: 1 }, { text: { en: "It is expensive and rare", fr: "Il est coûteux et rare", rw: "Igura kandi ibonetse nabi" }, isCorrect: false, order: 2 }, { text: { en: "It only grows in dry areas", fr: "Elle ne pousse que dans les zones sèches", rw: "Ikura gusa mu turere tw'ubukahe" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Tithonia's fast growth and nitrogen content make it valuable.", fr: "Correct! La croissance rapide et teneur en azote le rendent précieux.", rw: "Nibyo! Ukura vuba kwa Tithonia n'azote nyinshi bitera kugira agaciro." }, if: { en: "Tithonia is valued for accessibility and nutrient richness.", fr: "Tithonia est valorisé pour son accessibilité.", rw: "Tithonia igira agaciro ku bw'ububonetse bwayo n'ubutunzi." } }, { stem: { en: "When should green manure be incorporated into soil?", fr: "Quand incorporer l'engrais vert?", rw: "Ni ryari ifumbire y'icyatsi igomba kuyirimbukwa mu butaka?" }, options: [{ text: { en: "Before planting main crop, at flowering", fr: "Avant la culture principale, à la floraison", rw: "Mbere yo gutera imyaka y'ingenzi, mu gihe cy'amataba" }, isCorrect: true, order: 1 }, { text: { en: "After main crop is planted", fr: "Après la culture principale", rw: "Nyuma yuko imyaka y'ingenzi yatewe" }, isCorrect: false, order: 2 }, { text: { en: "Only in dry season", fr: "Seulement en saison sèche", rw: "Mu gihe cy'izuba gusa" }, isCorrect: false, order: 3 }], cf: { en: "Excellent! At flowering, nutrient content is highest before seeding.", fr: "Excellent! À la floraison, la teneur en nutriments est maximale.", rw: "Ni byiza! Mu gihe cy'amataba, ibitera imikurire biri ku rwego rwisumbuye." }, if: { en: "Turn it in before planting to allow time to decompose.", fr: "Incorporer avant de planter pour laisser le temps de se décomposer.", rw: "Yirimbuke mbere yo gutera kugirango habeho igihe cyo gukonjora." } }, { stem: { en: "What happens to soil organic matter with regular green manure use?", fr: "Que se passe-t-il avec la matière organique?", rw: "Ibintu byavuye mu binyabuzima by'ubutaka bigenda bite?" }, options: [{ text: { en: "It increases gradually", fr: "Elle augmente progressivement", rw: "Biyongera buhoro buhoro" }, isCorrect: true, order: 1 }, { text: { en: "It decreases sharply", fr: "Elle diminue fortement", rw: "Bika vuba cyane" }, isCorrect: false, order: 2 }, { text: { en: "It stays the same", fr: "Elle reste la même", rw: "Bikomeza bingana" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Consistent use builds soil organic matter over seasons.", fr: "Correct! L'utilisation régulière augmente la matière organique.", rw: "Nibyo! Gukoresha buri gihe byungura ibintu byavuye mu binyabuzima." }, if: { en: "Organic matter builds up with consistent additions.", fr: "La matière organique s'accumule.", rw: "Ibintu byavuye mu binyabuzima biyunguka buhooro." } }] } },
      { title: { en: "Soil Testing and Monitoring", fr: "Test et surveillance des sols", rw: "Kugenzura n'ugusubiramo ubutaka" }, body: { en: "<p>Regular soil testing enables data-driven management. Rwanda's District Agriculture Offices provide free soil tests. Monitor: pH, organic matter %, NPK, and micronutrients like zinc and boron.</p>", fr: "<p>Les tests réguliers permettent une gestion basée sur les données. Les bureaux agricoles de district fournissent des tests gratuits.</p>", rw: "<p>Kugenzura ubutaka buri gihe ni ngombwa. Ibiro by'ubuhinzi bya Akarere bitanga ibizamini ku buntu.</p>" }, order: 3, quiz: { title: { en: "Soil Testing Quiz", fr: "Quiz test de sol", rw: "Ikizamini cyo kugenzura ubutaka" }, questions: [{ stem: { en: "Where can Rwandan farmers get free soil tests?", fr: "Où les agriculteurs peuvent-ils obtenir des tests de sol gratuits?", rw: "Ni he abahinzi bashobora kubona ibizamini ku buntu?" }, options: [{ text: { en: "District Agriculture Offices", fr: "Bureaux agricoles de district", rw: "Ibiro by'ubuhinzi bya Akarere" }, isCorrect: true, order: 1 }, { text: { en: "Only at expensive private labs", fr: "Uniquement dans des laboratoires privés coûteux", rw: "Mu maburotwa yagenzi gusa" }, isCorrect: false, order: 2 }, { text: { en: "Only at the national capital", fr: "Seulement dans la capitale", rw: "I Kigali gusa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! District Agriculture Offices provide free soil testing.", fr: "Correct! Les bureaux agricoles de district fournissent des tests gratuits.", rw: "Nibyo! Ibiro by'ubuhinzi bya Akarere bitanga ibizamini ku buntu." }, if: { en: "Rwanda has government services including free soil testing.", fr: "Le Rwanda dispose de services gouvernementaux.", rw: "U Rwanda rufite serivisi za leta harimo ibizamini ku buntu." } }, { stem: { en: "Why keep soil test records over multiple seasons?", fr: "Pourquoi conserver les résultats sur plusieurs saisons?", rw: "Ni iki gituma ari ngombwa kugumana inyandiko?" }, options: [{ text: { en: "To track improvements and guide fertilizer decisions", fr: "Pour suivre les améliorations et orienter les décisions d'engrais", rw: "Gukurikirana inonosorwa no guganisha ibyemezo by'ifumbire" }, isCorrect: true, order: 1 }, { text: { en: "It is required by law", fr: "C'est requis par la loi", rw: "Bisabwa n'amategeko" }, isCorrect: false, order: 2 }, { text: { en: "Records have no value", fr: "Les dossiers n'ont aucune valeur", rw: "Inyandiko nta gaciro rigira" }, isCorrect: false, order: 3 }], cf: { en: "Exactly! Records show trends and help guide evidence-based decisions.", fr: "Exactement! Les dossiers montrent des tendances et guident les décisions.", rw: "Nibyo! Inyandiko zwereka imigendo kandi zifasha gufata ibyemezo." }, if: { en: "Historical soil data helps farmers make informed decisions.", fr: "Les données historiques aident les agriculteurs.", rw: "Amakuru y'ubutaka y'amateka afasha abahinzi gufata ibyemezo byikubiyemo." } }, { stem: { en: "Which micronutrient deficiency is common in Rwandan soils?", fr: "Quelle carence en oligo-éléments est fréquente?", rw: "Ni ikihe kicukiro gike cyuzuye mu butaka bw'u Rwanda?" }, options: [{ text: { en: "Zinc and boron", fr: "Zinc et bore", rw: "Zinc na Bore" }, isCorrect: true, order: 1 }, { text: { en: "Gold and silver", fr: "Or et argent", rw: "Inzahabu n'ifeza" }, isCorrect: false, order: 2 }, { text: { en: "Carbon and oxygen", fr: "Carbone et oxygène", rw: "Carbone na oksijene" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Zinc and boron deficiencies are commonly found in Rwanda.", fr: "Correct! Les carences en zinc et bore sont courantes au Rwanda.", rw: "Nibyo! Ubukene bwa Zinc na Bore bugaragarira neza mu Rwanda." }, if: { en: "Rwanda's soils commonly show zinc and boron deficiencies.", fr: "Les sols rwandais montrent souvent ces carences.", rw: "Ubutaka bw'u Rwanda kenshi bugaragaza ubukene bwa Zinc na Bore." } }] } },
    ]
  );
  console.log("✅ Course 1 (Soil Health & Composting) created with 3 modules, 9 lessons, 27 questions");

  // ── 6. COURSE 2: Pest Management ──────────────────────────────────────────
  const course2 = await prisma.course.create({
    data: {
      title: { en: "Pest Management Techniques", fr: "Techniques de gestion des ravageurs", rw: "Uburyo bwo kurwanya inzoka n'udukoko" },
      description: { en: "Comprehensive strategies for identifying and managing crop pests using integrated pest management (IPM) principles.", fr: "Stratégies complètes pour identifier et gérer les ravageurs en utilisant les principes de la gestion intégrée (GIR).", rw: "Ingamba zuzuye zo kumenya no gucunga inzoka binyuze mu ngamba zunze ubumwe." },
      trainerId: trainer2.id,
      status: CourseStatus.PUBLISHED,
      availableLanguages: ["en", "fr", "rw"],
    },
  });

  const c2Data = [
    { title: { en: "Identifying Common Crop Pests", fr: "Identifier les ravageurs courants", rw: "Kumenya inzoka n'udukoko bwa buri gihe" }, order: 1, lessons: [
      { title: { en: "Insect Pests", fr: "Ravageurs insectes", rw: "Udukoko twangiza" }, body: { en: "<p>Common insect pests in Rwanda: aphids, thrips, whiteflies, and the fall armyworm. Identify them by feeding damage and appearance. Early identification prevents major yield losses.</p>", fr: "<p>Ravageurs insectes courants: pucerons, thrips, mouches blanches et légionnaire. Apprenez à les identifier.</p>", rw: "<p>Udukoko dukunda gusahurana imyaka: Pusedon, Thrips, Inzu y'icyera, n'umwanzi w'ingabo.</p>" }, order: 1, quiz: { title: { en: "Insect Pests Quiz", fr: "Quiz ravageurs insectes", rw: "Ikizamini cy'udukoko twangiza" }, questions: [{ stem: { en: "What is the most destructive maize pest currently in Rwanda?", fr: "Quel est le ravageur du maïs le plus destructeur au Rwanda?", rw: "Ni izihe inzoka zikomeye z'ibigori mu Rwanda ubu?" }, options: [{ text: { en: "The fall armyworm", fr: "La légionnaire d'automne", rw: "Umwanzi w'ingabo" }, isCorrect: true, order: 1 }, { text: { en: "The aphid", fr: "Le puceron", rw: "Pusedon" }, isCorrect: false, order: 2 }, { text: { en: "The whitefly", fr: "La mouche blanche", rw: "Inzu y'icyera" }, isCorrect: false, order: 3 }], cf: { en: "Correct! The fall armyworm is now Rwanda's most serious maize pest.", fr: "Correct! La légionnaire est le ravageur le plus grave du Rwanda.", rw: "Nibyo! Umwanzi w'ingabo ubu ni inzoka nkuru z'ibigori mu Rwanda." }, if: { en: "Review the lesson on insect pest identification.", fr: "Revoyez la leçon sur les ravageurs.", rw: "Subiramo isomo ry'inzoka z'udukoko." } }, { stem: { en: "What is the first step when you notice pest damage in your field?", fr: "Quelle est la première étape quand vous remarquez des dégâts?", rw: "Ni ikihe intambwe ya mbere iyo ubonye inzoka mu murima?" }, options: [{ text: { en: "Identify and monitor the pest", fr: "Identifier et surveiller le ravageur", rw: "Menya kandi genzura inzoka" }, isCorrect: true, order: 1 }, { text: { en: "Apply maximum pesticides immediately", fr: "Appliquer immédiatement des pesticides maximum", rw: "Shyira imiti nyinshi vuba" }, isCorrect: false, order: 2 }, { text: { en: "Remove all crops", fr: "Enlever toutes les cultures", rw: "Kura imyaka yose" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Identification guides appropriate treatment choice.", fr: "Correct! L'identification guide le choix du traitement.", rw: "Nibyo! Kumenya inzoka guganisha guhitamo imiti ihuye." }, if: { en: "Always identify before treating.", fr: "Toujours identifier avant de traiter.", rw: "Buri gihe menya mbere yo kuvura." } }, { stem: { en: "How often should you scout maize fields during critical growth stages?", fr: "À quelle fréquence inspecter les champs pendant les stades critiques?", rw: "Ni kangahe ugomba genzura imirima y'ibigori mu bihe by'ingenzi?" }, options: [{ text: { en: "Twice weekly", fr: "Deux fois par semaine", rw: "Kabiri mu cyumweru" }, isCorrect: true, order: 1 }, { text: { en: "Once a month", fr: "Une fois par mois", rw: "Rimwe mu kwezi" }, isCorrect: false, order: 2 }, { text: { en: "Only at harvest", fr: "Seulement à la récolte", rw: "Guha gusarura gusa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Twice-weekly scouting catches problems early.", fr: "Correct! L'inspection deux fois par semaine détecte les problèmes tôt.", rw: "Nibyo! Kugenzura kabiri mu cyumweru bigira ibibazo vuba." }, if: { en: "Regular monitoring is essential for early pest detection.", fr: "Le suivi régulier est essentiel.", rw: "Kugenzura buri gihe ni ngombwa." } }] } },
      { title: { en: "Fungal and Bacterial Diseases", fr: "Maladies fongiques et bactériennes", rw: "Indwara z'ubunyobwa na bagiteri" }, body: { en: "<p>Plant diseases caused by fungi and bacteria can devastate crops. Common in Rwanda: bean rust, late blight of potatoes, bacterial wilt of tomatoes. Proper identification guides treatment.</p>", fr: "<p>Maladies courantes au Rwanda: rouille du haricot, mildiou de la pomme de terre, flétrissement bactérien de la tomate.</p>", rw: "<p>Indwara zisanzwe mu Rwanda: amshwi y'ibishyimbo, indwara ya nyuma y'ibirayi, indwara ya bagiteri y'inyanya.</p>" }, order: 2, quiz: { title: { en: "Plant Disease Quiz", fr: "Quiz maladies des plantes", rw: "Ikizamini cy'indwara z'ibimera" }, questions: [{ stem: { en: "What is a common fungal disease affecting beans in Rwanda?", fr: "Quelle maladie fongique affecte les haricots au Rwanda?", rw: "Ni ikihe indwara y'ubunyobwa ikangisha ibishyimbo mu Rwanda?" }, options: [{ text: { en: "Bean rust", fr: "Rouille du haricot", rw: "Amshwi y'ibishyimbo" }, isCorrect: true, order: 1 }, { text: { en: "Bacterial wilt", fr: "Flétrissement bactérien", rw: "Indwara ya bagiteri" }, isCorrect: false, order: 2 }, { text: { en: "Root rot", fr: "Pourriture racinaire", rw: "Kunyanyagira kw'imizi" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Bean rust is a major fungal disease in Rwanda.", fr: "Correct! La rouille du haricot est une maladie fongique majeure au Rwanda.", rw: "Nibyo! Amshwi y'ibishyimbo ni indwara nkuru y'ubunyobwa mu Rwanda." }, if: { en: "Review the lesson on fungal diseases.", fr: "Revoyez la leçon sur les maladies fongiques.", rw: "Subiramo isomo ry'indwara z'ubunyobwa." } }, { stem: { en: "What causes late blight of potatoes?", fr: "Qu'est-ce qui cause le mildiou tardif de la pomme de terre?", rw: "Ni iki giteza indwara ya nyuma y'ibirayi?" }, options: [{ text: { en: "A fungus-like organism (Phytophthora)", fr: "Un organisme ressemblant à un champignon", rw: "Ubwoko bw'ubunyobwa (Phytophthora)" }, isCorrect: true, order: 1 }, { text: { en: "Insects", fr: "Des insectes", rw: "Udukoko" }, isCorrect: false, order: 2 }, { text: { en: "Lack of water", fr: "Manque d'eau", rw: "Kubura amazi" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Late blight is caused by Phytophthora infestans.", fr: "Correct! Le mildiou est causé par Phytophthora infestans.", rw: "Nibyo! Indwara ya nyuma itewe na Phytophthora infestans." }, if: { en: "Late blight is caused by a water mold pathogen.", fr: "Le mildiou est causé par un pathogène.", rw: "Indwara ya nyuma itewe n'agakarabo k'amazi." } }, { stem: { en: "When should fungicides be applied for disease prevention?", fr: "Quand appliquer des fongicides pour la prévention?", rw: "Ni ryari imiti y'ubunyobwa igomba gushyirwa ku mpanuka?" }, options: [{ text: { en: "Preventively in high-humidity seasons", fr: "Préventivment en saisons humides", rw: "Ku mpanuka mu bihe by'ubuhehere" }, isCorrect: true, order: 1 }, { text: { en: "Only after disease appears", fr: "Seulement après l'apparition de la maladie", rw: "Nyuma yuko indwara igaragara" }, isCorrect: false, order: 2 }, { text: { en: "Never use fungicides", fr: "Ne jamais utiliser de fongicides", rw: "Ntukoresha imiti y'ubunyobwa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Preventive application is more effective than curative.", fr: "Correct! L'application préventive est plus efficace que curative.", rw: "Nibyo! Gushyira imiti ku mpanuka ni byiza kuruta gukira." }, if: { en: "Prevention is more effective and cheaper than treatment.", fr: "La prévention est plus efficace et moins chère.", rw: "Gukumira ni byiza kandi kirabuza kurusha kuvura." } }] } },
      { title: { en: "Nematodes and Soil Pests", fr: "Nématodes et ravageurs du sol", rw: "Nematodes n'inzoka z'ubutaka" }, body: { en: "<p>Soil-dwelling pests like nematodes, wireworms, and cutworms damage crops below the surface. Symptoms: stunted growth, wilting, root damage. Crop rotation and solarization are effective management strategies.</p>", fr: "<p>Les ravageurs du sol endommagent les cultures sous la surface. Rotation des cultures et solarisation sont efficaces.</p>", rw: "<p>Inzoka zo mu butaka nka Nematodes n'izindi zangiza imyaka munsi y'ubutaka. Igurishije imyaka n'izuba binoze.</p>" }, order: 3, quiz: { title: { en: "Soil Pests Quiz", fr: "Quiz ravageurs du sol", rw: "Ikizamini cy'inzoka z'ubutaka" }, questions: [{ stem: { en: "What symptom indicates nematode damage in crops?", fr: "Quel symptôme indique des dommages causés par des nématodes?", rw: "Ni ikihe kimenyetso kigaragaza ingaruka za Nematodes?" }, options: [{ text: { en: "Stunted growth and root damage", fr: "Croissance rabougrie et dommages racinaires", rw: "Imikurire mike n'inzoka zikonko" }, isCorrect: true, order: 1 }, { text: { en: "Yellow leaves only", fr: "Seulement les feuilles jaunes", rw: "Amashami y'umuhondo gusa" }, isCorrect: false, order: 2 }, { text: { en: "No visible symptoms", fr: "Pas de symptômes visibles", rw: "Nta bimenyetso bigaragara" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Nematode-damaged plants show stunted growth and damaged roots.", fr: "Correct! Les plantes endommagées montrent une croissance rabougrie.", rw: "Nibyo! Ibimera byangijwe na Nematodes bigaragaza imikurire mike n'inzoka zikonko." }, if: { en: "Soil pest damage often shows up as overall poor plant health.", fr: "Les dommages des ravageurs du sol se manifestent souvent.", rw: "Ingaruka z'inzoka z'ubutaka kenshi zigaragara mu buzima buke bw'ibimera." } }, { stem: { en: "Which management strategy helps control nematodes?", fr: "Quelle stratégie aide à contrôler les nématodes?", rw: "Ni ikihe gahunda gifasha gucunga Nematodes?" }, options: [{ text: { en: "Crop rotation", fr: "Rotation des cultures", rw: "Igurishije imyaka" }, isCorrect: true, order: 1 }, { text: { en: "More frequent watering", fr: "Arrosage plus fréquent", rw: "Kuhira kenshi" }, isCorrect: false, order: 2 }, { text: { en: "Planting same crop every year", fr: "Planter la même culture chaque année", rw: "Gutera imyaka imwe buri mwaka" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Rotation breaks the nematode life cycle.", fr: "Correct! La rotation brise le cycle de vie des nématodes.", rw: "Nibyo! Igurishije imyaka itura umuzunguruko wa Nematodes." }, if: { en: "Rotation disrupts pest life cycles.", fr: "La rotation perturbe les cycles de vie.", rw: "Igurishije imyaka itura imizunguruko y'inzoka." } }, { stem: { en: "What is soil solarization?", fr: "Qu'est-ce que la solarisation du sol?", rw: "Gusolariza ubutaka ni iki?" }, options: [{ text: { en: "Using plastic sheeting and sunlight to heat and pasteurize soil", fr: "Utiliser une feuille plastique et le soleil pour chauffer et pasteuriser le sol", rw: "Gukoresha plastike n'izuba gushyisha no gutuza ubutaka" }, isCorrect: true, order: 1 }, { text: { en: "Adding solar-powered irrigation", fr: "Ajouter l'irrigation solaire", rw: "Kongera kuhira kwa izuba" }, isCorrect: false, order: 2 }, { text: { en: "Planting sun-loving crops", fr: "Planter des cultures aimant le soleil", rw: "Gutera imyaka ikunda izuba" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Solarization uses trapped solar heat to kill soil pests and pathogens.", fr: "Correct! La solarisation utilise la chaleur solaire pour tuer les ravageurs.", rw: "Nibyo! Gusolariza bikoreshwa ubushyuhe bw'izuba kwica inzoka n'ibikorwa." }, if: { en: "Solarization is a non-chemical way to reduce soil pests.", fr: "La solarisation est un moyen non chimique de réduire les ravageurs.", rw: "Gusolariza ni uburyo butari bw'imiti bwo kugabanya inzoka." } }] } },
    ]},
    { title: { en: "Integrated Pest Management (IPM)", fr: "Gestion intégrée des ravageurs (GIR)", rw: "Gucunga inzoka binyuze mu ngamba zunze ubumwe" }, order: 2, lessons: [
      { title: { en: "IPM Principles and Strategy", fr: "Principes et stratégie de la GIR", rw: "Ingamba n'uburyo bwa IPM" }, body: { en: "<p>IPM combines biological, cultural, physical, and chemical controls to minimize pest damage while reducing environmental impact. It prioritizes prevention over treatment.</p>", fr: "<p>La GIR combine des contrôles biologiques, culturels, physiques et chimiques. Elle priorise la prévention.</p>", rw: "<p>IPM ihuriza hamwe imirimo yo gucunga inzoka binyuze mu bimera, uburyo bw'ubuhinzi, ibikorwa by'imiti.</p>" }, order: 1, quiz: { title: { en: "IPM Principles Quiz", fr: "Quiz principes GIR", rw: "Ikizamini cy'ingamba za IPM" }, questions: [{ stem: { en: "What does IPM stand for?", fr: "Que signifie GIR (en anglais IPM)?", rw: "IPM bivuze iki?" }, options: [{ text: { en: "Integrated Pest Management", fr: "Gestion intégrée des ravageurs", rw: "Gucunga inzoka binyuze mu ngamba zunze ubumwe" }, isCorrect: true, order: 1 }, { text: { en: "Intensive Pesticide Method", fr: "Méthode intensive de pesticides", rw: "Uburyo bwa Pesticide nyinshi" }, isCorrect: false, order: 2 }, { text: { en: "Immediate Plant Medicine", fr: "Médicament immédiat pour plantes", rw: "Imiti vuba y'ibimera" }, isCorrect: false, order: 3 }], cf: { en: "Correct! IPM = Integrated Pest Management, a holistic approach.", fr: "Correct! GIR = Gestion Intégrée des Ravageurs.", rw: "Nibyo! IPM ni Integrated Pest Management, uburyo buzuye." }, if: { en: "IPM is an ecosystem-based pest control strategy.", fr: "La GIR est une stratégie de contrôle basée sur l'écosystème.", rw: "IPM ni ingamba yo kugenzura inzoka bishingiye ku mudiho." } }, { stem: { en: "What does IPM prioritize?", fr: "Que priorise la GIR?", rw: "IPM yita ku ki cyambere?" }, options: [{ text: { en: "Prevention over treatment", fr: "La prévention sur le traitement", rw: "Gukumira kurusha kuvura" }, isCorrect: true, order: 1 }, { text: { en: "Maximum chemical use", fr: "Utilisation maximum de produits chimiques", rw: "Gukoresha imiti nyinshi" }, isCorrect: false, order: 2 }, { text: { en: "Removing all plants", fr: "Enlever toutes les plantes", rw: "Kura ibimera byose" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Prevention is always the first priority in IPM.", fr: "Correct! La prévention est toujours la première priorité dans la GIR.", rw: "Nibyo! Gukumira ni intambwe ya mbere buri gihe mu IPM." }, if: { en: "IPM seeks to prevent pest problems before they occur.", fr: "La GIR cherche à prévenir les problèmes.", rw: "IPM ishaka gukumira ibibazo by'inzoka mbere yo kuvuka." } }, { stem: { en: "Which control method does IPM prioritize over chemical pesticides?", fr: "Quelle méthode la GIR priorise-t-elle sur les pesticides chimiques?", rw: "Ni ubuhe buryo IPM yita cyane kuruta imiti y'imiti?" }, options: [{ text: { en: "Biological controls", fr: "Les contrôles biologiques", rw: "Gucunga binyuze mu binyabuzima" }, isCorrect: true, order: 1 }, { text: { en: "More chemicals", fr: "Plus de produits chimiques", rw: "Imiti myinshi" }, isCorrect: false, order: 2 }, { text: { en: "Crop destruction", fr: "Destruction des cultures", rw: "Gusenya imyaka" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Biological controls use natural enemies and are environmentally friendly.", fr: "Correct! Les contrôles biologiques utilisent des ennemis naturels.", rw: "Nibyo! Gucunga binyuze mu binyabuzima bikoreshwa inzi z'umwanzi w'kamere." }, if: { en: "IPM prefers environmentally friendly approaches.", fr: "La GIR préfère les approches écologiques.", rw: "IPM ikunda uburyo butagirira nabi ibidukikije." } }] } },
      { title: { en: "Biological Control Methods", fr: "Méthodes de contrôle biologique", rw: "Uburyo bwo gucunga binyuze mu binyabuzima" }, body: { en: "<p>Biological control uses natural enemies of pests — predatory insects, parasitic wasps, beneficial fungi. Encourage beneficial insects by planting flowering border plants.</p>", fr: "<p>La lutte biologique utilise les ennemis naturels des ravageurs. Encouragez les insectes bénéfiques en plantant des plantes fleuries.</p>", rw: "<p>Gucunga binyuze mu binyabuzima bikoreshwa inzi z'umwanzi w'inzoka. Tereza insekta z'ingirakamaro gutera ibimera bifite amashyamba.</p>" }, order: 2, quiz: { title: { en: "Biological Control Quiz", fr: "Quiz contrôle biologique", rw: "Ikizamini cyo gucunga binyuze mu binyabuzima" }, questions: [{ stem: { en: "What does biological control use to reduce pests?", fr: "Que la lutte biologique utilise-t-elle?", rw: "Gucunga binyuze mu binyabuzima bikoreshwa iki?" }, options: [{ text: { en: "Natural enemies of pests", fr: "Les ennemis naturels des ravageurs", rw: "Inzi z'umwanzi w'inzoka" }, isCorrect: true, order: 1 }, { text: { en: "Chemical pesticides", fr: "Des pesticides chimiques", rw: "Imiti y'imiti" }, isCorrect: false, order: 2 }, { text: { en: "Mechanical traps only", fr: "Seulement des pièges mécaniques", rw: "Imigabo gusa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Natural predators, parasites, and pathogens control pest populations.", fr: "Correct! Les prédateurs naturels contrôlent les populations de ravageurs.", rw: "Nibyo! Inzoka z'umwanzi, ibikorwa, n'indwara bigenzura inzoka." }, if: { en: "Biological control relies on nature's own pest control mechanisms.", fr: "La lutte biologique repose sur les mécanismes naturels.", rw: "Gucunga binyuze mu binyabuzima bishingira ku buryo bwa kamere." } }, { stem: { en: "How can farmers encourage beneficial insects?", fr: "Comment les agriculteurs peuvent-ils encourager les insectes bénéfiques?", rw: "Abahinzi bashobora gute gutera inkunga insekta z'ingirakamaro?" }, options: [{ text: { en: "Plant flowering border plants", fr: "Planter des plantes fleuries en bordure", rw: "Gutera ibimera bifite amashyamba ku mpaka" }, isCorrect: true, order: 1 }, { text: { en: "Apply more pesticides", fr: "Appliquer plus de pesticides", rw: "Shyira imiti myinshi" }, isCorrect: false, order: 2 }, { text: { en: "Remove all vegetation", fr: "Enlever toute la végétation", rw: "Kura ubwatsi bwose" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Flowering plants attract and feed beneficial predatory insects.", fr: "Correct! Les plantes fleuries attirent les insectes prédateurs bénéfiques.", rw: "Nibyo! Ibimera bifite amashyamba bifata no gutunga insekta z'ingirakamaro." }, if: { en: "Creating habitat for beneficial insects is a key biological control strategy.", fr: "Créer un habitat pour les insectes bénéfiques est une stratégie clé.", rw: "Gukora aho insekta z'ingirakamaro zibaho ni ingamba nkuru." } }, { stem: { en: "What is Bacillus thuringiensis (Bt)?", fr: "Qu'est-ce que le Bacillus thuringiensis (Bt)?", rw: "Bacillus thuringiensis (Bt) ni iki?" }, options: [{ text: { en: "A naturally occurring bacterium used as biopesticide", fr: "Une bactérie naturelle utilisée comme biopesticide", rw: "Bagiteri ya kamere ikoreshwa nk'ibiopesticide" }, isCorrect: true, order: 1 }, { text: { en: "A chemical synthetic pesticide", fr: "Un pesticide chimique synthétique", rw: "Imiti y'imiti yakozwe" }, isCorrect: false, order: 2 }, { text: { en: "A type of fertilizer", fr: "Un type d'engrais", rw: "Ubwoko bw'ifumbire" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Bt is a soil bacterium that produces proteins toxic to insect larvae.", fr: "Correct! Bt est une bactérie du sol qui produit des protéines toxiques pour les larves.", rw: "Nibyo! Bt ni bagiteri y'ubutaka ikora poroteyine zangirira udukoko." }, if: { en: "Bt is a natural biopesticide approved for organic farming.", fr: "Bt est un biopesticide naturel approuvé pour l'agriculture biologique.", rw: "Bt ni ibiopesticide ya kamere yemejwe mu buhinzi bwa kamere." } }] } },
      { title: { en: "Safe Pesticide Use", fr: "Utilisation sûre des pesticides", rw: "Gukoresha neza imiti y'inzoka" }, body: { en: "<p>When chemical control is necessary: use registered pesticides at recommended rates, wear protective equipment, follow pre-harvest intervals. In Rwanda, buy from licensed agro-dealers and keep children away from treated areas.</p>", fr: "<p>Utilisez des pesticides homologués aux doses recommandées, portez des EPI et respectez les délais avant récolte.</p>", rw: "<p>Iyo imiti ari ngombwa: koresha imiti yemejwe, genda n'ibikoresho by'uburinzi, kandi ukurikize ibihe mbere yo gusarura.</p>" }, order: 3, quiz: { title: { en: "Safe Pesticide Quiz", fr: "Quiz utilisation sûre", rw: "Ikizamini cy'imiti neza" }, questions: [{ stem: { en: "What must you always wear when applying pesticides?", fr: "Que devez-vous toujours porter lors de l'application de pesticides?", rw: "Ni iki ugomba buri gihe kwambara iyo ushyira imiti?" }, options: [{ text: { en: "Protective equipment (PPE)", fr: "Équipement de protection individuelle (EPI)", rw: "Ibikoresho by'uburinzi" }, isCorrect: true, order: 1 }, { text: { en: "No special clothing needed", fr: "Aucun vêtement spécial nécessaire", rw: "Nta kwambara kwihariye" }, isCorrect: false, order: 2 }, { text: { en: "Only gloves", fr: "Seulement des gants", rw: "Incuti gusa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Full PPE protects you from pesticide exposure.", fr: "Correct! L'EPI complet vous protège de l'exposition aux pesticides.", rw: "Nibyo! Ibikoresho by'uburinzi biraguhana ingaruka z'imiti." }, if: { en: "Always protect yourself when handling pesticides.", fr: "Protégez-vous toujours avec des pesticides.", rw: "Buri gihe wirinde iyo ukoresha imiti." } }, { stem: { en: "Where should you buy pesticides in Rwanda?", fr: "Où acheter des pesticides au Rwanda?", rw: "Ni he ugomba kugura imiti mu Rwanda?" }, options: [{ text: { en: "From licensed agro-dealers only", fr: "Uniquement chez des agro-négociants agréés", rw: "Ku bagurisha b'imiti yemejwe gusa" }, isCorrect: true, order: 1 }, { text: { en: "From any market stall", fr: "Dans n'importe quel étal de marché", rw: "Mu isoko iriyonana" }, isCorrect: false, order: 2 }, { text: { en: "Make your own chemical mix", fr: "Préparer votre propre mélange", rw: "Kora uruvange rwawe" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Licensed agro-dealers sell approved, genuine products.", fr: "Correct! Les agro-négociants agréés vendent des produits approuvés.", rw: "Nibyo! Abagurisha b'imiti yemejwe bagura ibicuruzwa byemejwe kandi by'ukuri." }, if: { en: "Only buy pesticides from registered agro-dealers for safety.", fr: "Achetez uniquement chez des agro-négociants enregistrés.", rw: "Gura imiti ku bagurisha bemejwe gusa kugirango ube mu mutekano." } }, { stem: { en: "What is the pre-harvest interval?", fr: "Qu'est-ce que le délai avant récolte?", rw: "Igihe cya mbere yo gusarura ni iki?" }, options: [{ text: { en: "The waiting period between pesticide application and harvest", fr: "La période d'attente entre l'application et la récolte", rw: "Igihe cyitegerezwa hagati yo gushyira imiti no gusarura" }, isCorrect: true, order: 1 }, { text: { en: "The time to plant after harvesting", fr: "Le temps pour planter après la récolte", rw: "Igihe cyo gutera nyuma yo gusarura" }, isCorrect: false, order: 2 }, { text: { en: "When to apply fertilizer", fr: "Quand appliquer l'engrais", rw: "Igihe cyo gushyira ifumbire" }, isCorrect: false, order: 3 }], cf: { en: "Correct! This interval ensures pesticide residues are safe before consumption.", fr: "Correct! Cet intervalle garantit que les résidus de pesticides sont sûrs.", rw: "Nibyo! Iyi ntera igaragaza ko imyidagaduro y'imiti iri mu mutekano mbere yo kurya." }, if: { en: "Always check and follow the pre-harvest interval on pesticide labels.", fr: "Toujours vérifier le délai avant récolte.", rw: "Buri gihe reba kandi ukurikize igihe cya mbere yo gusarura ku birango by'imiti." } }] } },
    ]},
    { title: { en: "Crop-Specific Pest Management", fr: "Gestion des ravageurs spécifiques", rw: "Gucunga inzoka zijyanye n'imyaka yihariye" }, order: 3, lessons: [
      { title: { en: "Managing Pests in Maize", fr: "Gérer les ravageurs dans le maïs", rw: "Gucunga inzoka mu bigori" }, body: { en: "<p>Fall armyworm (Spodoptera frugiperda) is Rwanda's most destructive maize pest. Scout twice weekly, hand-pick egg masses early. Apply Bt as first-line biopesticide control.</p>", fr: "<p>La légionnaire d'automne est le ravageur du maïs le plus destructeur au Rwanda.</p>", rw: "<p>Umwanzi w'ingabo (Fall armyworm) ubu ni inzoka zikomeye z'ibigori mu Rwanda.</p>" }, order: 1, quiz: { title: { en: "Maize Pest Quiz", fr: "Quiz ravageurs maïs", rw: "Ikizamini cy'inzoka z'ibigori" }, questions: [{ stem: { en: "What is the fall armyworm's scientific name?", fr: "Quel est le nom scientifique de la légionnaire d'automne?", rw: "Ni ikihe izina ry'ubumenyi ry'umwanzi w'ingabo?" }, options: [{ text: { en: "Spodoptera frugiperda", fr: "Spodoptera frugiperda", rw: "Spodoptera frugiperda" }, isCorrect: true, order: 1 }, { text: { en: "Aphidius colemani", fr: "Aphidius colemani", rw: "Aphidius colemani" }, isCorrect: false, order: 2 }, { text: { en: "Trichogramma chilonis", fr: "Trichogramma chilonis", rw: "Trichogramma chilonis" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Spodoptera frugiperda is the scientific name for fall armyworm.", fr: "Correct! Spodoptera frugiperda est le nom scientifique.", rw: "Nibyo! Spodoptera frugiperda ni izina ry'ubumenyi ry'umwanzi w'ingabo." }, if: { en: "The fall armyworm's scientific name is Spodoptera frugiperda.", fr: "Le nom scientifique est Spodoptera frugiperda.", rw: "Izina ry'ubumenyi ni Spodoptera frugiperda." } }, { stem: { en: "What is the recommended scouting frequency for fall armyworm?", fr: "Quelle est la fréquence recommandée pour la légionnaire?", rw: "Ni kangahe bisabwa kugenzura umwanzi w'ingabo?" }, options: [{ text: { en: "Twice weekly", fr: "Deux fois par semaine", rw: "Kabiri mu cyumweru" }, isCorrect: true, order: 1 }, { text: { en: "Once a month", fr: "Une fois par mois", rw: "Rimwe mu kwezi" }, isCorrect: false, order: 2 }, { text: { en: "Once a year", fr: "Une fois par an", rw: "Rimwe mu mwaka" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Twice-weekly scouting catches infestations early.", fr: "Correct! L'inspection deux fois par semaine détecte tôt.", rw: "Nibyo! Kugenzura kabiri mu cyumweru bigira ibibazo vuba." }, if: { en: "Frequent monitoring is key for fall armyworm management.", fr: "Le suivi fréquent est essentiel.", rw: "Kugenzura kenshi ni ingenzi mu gucunga umwanzi w'ingabo." } }, { stem: { en: "Which biopesticide is approved for fall armyworm control?", fr: "Quel biopesticide est approuvé pour la légionnaire?", rw: "Ni izihe ibiopesticide zemejwe gucunga umwanzi w'ingabo?" }, options: [{ text: { en: "Bacillus thuringiensis (Bt)", fr: "Bacillus thuringiensis (Bt)", rw: "Bacillus thuringiensis (Bt)" }, isCorrect: true, order: 1 }, { text: { en: "DDT", fr: "DDT", rw: "DDT" }, isCorrect: false, order: 2 }, { text: { en: "Glyphosate", fr: "Glyphosate", rw: "Glyphosate" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Bt is an effective, safe biopesticide for fall armyworm larvae.", fr: "Correct! Bt est un biopesticide efficace et sûr.", rw: "Nibyo! Bt ni ibiopesticide inoze kandi yizewe gucunga inzoka z'umwanzi w'ingabo." }, if: { en: "Use approved biopesticides like Bt as first-line control.", fr: "Utilisez des biopesticides approuvés comme Bt.", rw: "Koresha ibiopesticide zemejwe nka Bt nk'imiti ya mbere." } }] } },
      { title: { en: "Bean and Legume Pest Control", fr: "Contrôle des ravageurs du haricot", rw: "Gucunga inzoka z'ibishyimbo" }, body: { en: "<p>Bean weevils in storage, bean stem maggots, and bean rust are the main threats. Use hermetic storage to prevent weevil damage. Apply fungicides preventively in high-humidity seasons.</p>", fr: "<p>Charançons en stockage, asticots de tige et rouille sont les principales menaces.</p>", rw: "<p>Insekta z'ibishyimbo mu bubiko, inzoka z'inkingi, n'amshwi ni inzitizi nkuru.</p>" }, order: 2, quiz: { title: { en: "Bean Pest Quiz", fr: "Quiz ravageurs haricot", rw: "Ikizamini cy'inzoka z'ibishyimbo" }, questions: [{ stem: { en: "How do you prevent bean weevil damage in storage?", fr: "Comment prévenir les dommages du charançon en stockage?", rw: "Ni gute ukirinda ingaruka z'insekta mu bubiko?" }, options: [{ text: { en: "Use hermetic (airtight) storage", fr: "Utiliser un stockage hermétique", rw: "Koresha bubiko butagira umwuka" }, isCorrect: true, order: 1 }, { text: { en: "Keep storage area wet", fr: "Garder la zone de stockage humide", rw: "Komeza ububiko bufite amazi" }, isCorrect: false, order: 2 }, { text: { en: "Mix with fertilizer", fr: "Mélanger avec de l'engrais", rw: "Suhuza n'ifumbire" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Hermetic storage deprives weevils of oxygen, preventing reproduction.", fr: "Correct! Le stockage hermétique prive les charançons d'oxygène.", rw: "Nibyo! Ububiko butagira umwuka buteba insekta umwuka, bubirinda gukagagana." }, if: { en: "Hermetic storage is the most effective way to prevent storage pests.", fr: "Le stockage hermétique est le moyen le plus efficace.", rw: "Ububiko butagira umwuka ni uburyo bwiza bwo gukumira inzoka." } }, { stem: { en: "When should fungicides be applied to protect beans from rust?", fr: "Quand appliquer des fongicides pour protéger les haricots de la rouille?", rw: "Ni ryari imiti y'ubunyobwa igomba gushyirwa kurinda ibishyimbo?" }, options: [{ text: { en: "Preventively in high-humidity seasons", fr: "Préventivement en saisons humides", rw: "Ku mpanuka mu bihe by'ubuhehere" }, isCorrect: true, order: 1 }, { text: { en: "Only after rust appears", fr: "Seulement après l'apparition de la rouille", rw: "Nyuma gusa yuko amshwi agaragara" }, isCorrect: false, order: 2 }, { text: { en: "Fungicides are not needed for beans", fr: "Les fongicides ne sont pas nécessaires", rw: "Imiti y'ubunyobwa ntisabwa" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Prevention before symptoms appear is most effective.", fr: "Correct! La prévention avant les symptômes est plus efficace.", rw: "Nibyo! Gukumira mbere y'ibimenyetso ni byiza cyane." }, if: { en: "Preventive fungicide use is more effective than curative.", fr: "L'utilisation préventive est plus efficace.", rw: "Gukoresha imiti ku mpanuka ni byiza kuruta kuvura." } }, { stem: { en: "What type of storage prevents bean weevil infestation?", fr: "Quel type de stockage prévient l'infestation?", rw: "Ni ubwoko bw'ububiko ki bukumira insekta?" }, options: [{ text: { en: "Hermetic (airtight) storage containers", fr: "Conteneurs de stockage hermétiques", rw: "Ibigega by'ububiko butagira umwuka" }, isCorrect: true, order: 1 }, { text: { en: "Open baskets", fr: "Paniers ouverts", rw: "Ingata zifunguye" }, isCorrect: false, order: 2 }, { text: { en: "Wet cloth bags", fr: "Sacs en tissu mouillé", rw: "Amaseruka ya setiri ifite amazi" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Airtight containers cut off oxygen supply to weevils.", fr: "Correct! Les conteneurs hermétiques coupent l'oxygène des charançons.", rw: "Nibyo! Ibigega bituye umwuka bikata ingufu z'umwuka ku nsekta." }, if: { en: "Beans need airtight storage to prevent weevil damage.", fr: "Les haricots ont besoin d'un stockage hermétique.", rw: "Ibishyimbo bisaba ububiko butagira umwuka kugirango bikirindwe inzoka." } }] } },
      { title: { en: "Vegetable Garden Pest Prevention", fr: "Prévention des ravageurs potager", rw: "Gukumira inzoka mu mirima y'imboga" }, body: { en: "<p>Vegetable gardens face diverse pests. Practice crop rotation. Use reflective mulches against aphids. Install insect nets over seedlings. Plant companion plants like basil and marigold to repel pests.</p>", fr: "<p>Pratiquez la rotation, utilisez des paillis réfléchissants, installez des filets anti-insectes et plantez des plantes compagnes.</p>", rw: "<p>Gukora igurishije imyaka, koresha ibyorezo bikinya umucyo, shyira filete y'insekta, gutera ibimera by'inshuti.</p>" }, order: 3, quiz: { title: { en: "Vegetable Pest Quiz", fr: "Quiz ravageurs légumes", rw: "Ikizamini cy'inzoka z'imboga" }, questions: [{ stem: { en: "Which companion plants help repel pests from vegetables?", fr: "Quelles plantes compagnes repoussent les ravageurs?", rw: "Ni ibimera by'inshuti bi guhashya inzoka z'imboga?" }, options: [{ text: { en: "Basil and marigold", fr: "Basilic et souci", rw: "Basil na Marigold" }, isCorrect: true, order: 1 }, { text: { en: "Potato and tomato", fr: "Pomme de terre et tomate", rw: "Ibirayi n'inyanya" }, isCorrect: false, order: 2 }, { text: { en: "Maize and beans", fr: "Maïs et haricots", rw: "Ibigori n'ibishyimbo" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Basil and marigold naturally repel common vegetable pests.", fr: "Correct! Le basilic et le souci repoussent naturellement les ravageurs.", rw: "Nibyo! Basil na Marigold zihashya inzoka z'imboga ya kamere." }, if: { en: "Companion planting uses plant relationships for natural pest control.", fr: "La plantation compagnonne utilise les relations entre plantes.", rw: "Gutera ibimera by'inshuti bikoreshwa imishyikiranabikorwa y'ibimera." } }, { stem: { en: "What does crop rotation do to pest populations?", fr: "Que fait la rotation des cultures aux populations de ravageurs?", rw: "Igurishije imyaka ikora iki ku mibare y'inzoka?" }, options: [{ text: { en: "Breaks pest cycles and reduces soil buildup", fr: "Brise les cycles et réduit l'accumulation dans le sol", rw: "Itura imizunguruko n'ibizunguruzi by'ubutaka" }, isCorrect: true, order: 1 }, { text: { en: "Increases pest populations", fr: "Augmente les populations de ravageurs", rw: "Iyongera mibare y'inzoka" }, isCorrect: false, order: 2 }, { text: { en: "Has no effect on pests", fr: "N'a aucun effet sur les ravageurs", rw: "Nta ngaruka ku inzoka" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Rotation prevents pests adapted to one crop from building up.", fr: "Correct! La rotation empêche les ravageurs de s'accumuler.", rw: "Nibyo! Igurishije imyaka irinda inzoka zujuje ku myaka imwe gukumira." }, if: { en: "Rotation breaks the cycle for host-specific pests.", fr: "La rotation brise le cycle des ravageurs spécifiques.", rw: "Igurishije imyaka itura umuzunguruko w'inzoka z'ibimera yihariye." } }, { stem: { en: "How do reflective mulches help with aphid control?", fr: "Comment les paillis réfléchissants aident contre les pucerons?", rw: "Ni gute ibyorezo bikinya umucyo bifasha gucunga Pusedon?" }, options: [{ text: { en: "The reflected light disorients and deters aphids", fr: "La lumière réfléchie désoriente et dissuade les pucerons", rw: "Umucyo ukinywa utatanya kandi uhashya Pusedon" }, isCorrect: true, order: 1 }, { text: { en: "They kill aphids on contact", fr: "Ils tuent les pucerons au contact", rw: "Bica Pusedon igihe bahana" }, isCorrect: false, order: 2 }, { text: { en: "They attract aphid predators", fr: "Ils attirent les prédateurs des pucerons", rw: "Bafata inzi z'umwanzi wa Pusedon" }, isCorrect: false, order: 3 }], cf: { en: "Correct! Reflected light confuses aphids, reducing their ability to land and feed.", fr: "Correct! La lumière réfléchie confond les pucerons.", rw: "Nibyo! Umucyo ukinywa utatanya Pusedon, ugabanya ubushobozi bwabo bwo kumanuka no kurya." }, if: { en: "Reflective mulch creates a visual barrier that deters aphids.", fr: "Le paillis réfléchissant crée une barrière visuelle.", rw: "Ibyorezo bikinya umucyo bikora impamvu y'amaso ihashya Pusedon." } }] } },
    ]},
  ];

  for (const modData of c2Data) {
    const mod = await prisma.module.create({ data: { courseId: course2.id, title: modData.title, order: modData.order } });
    for (const ld of modData.lessons) {
      const lesson = await prisma.lesson.create({ data: { moduleId: mod.id, title: ld.title, body: ld.body, order: ld.order } });
      if (ld.quiz) {
        const quiz = await prisma.quiz.create({ data: { lessonId: lesson.id, title: ld.quiz.title, passingScore: 70, allowRetry: true } });
        for (let qi = 0; qi < ld.quiz.questions.length; qi++) {
          const qd = ld.quiz.questions[qi];
          const question = await prisma.question.create({ data: { quizId: quiz.id, type: "MULTIPLE_CHOICE", stem: qd.stem, order: qi + 1, translationStatus: { en: "MANUAL", fr: "MANUAL", rw: "MANUAL" } } });
          for (const opt of qd.options) { await prisma.answerOption.create({ data: { questionId: question.id, text: opt.text, isCorrect: opt.isCorrect, order: opt.order } }); }
          await prisma.questionFeedback.create({ data: { questionId: question.id, correctFeedback: qd.cf, incorrectFeedback: qd.if } });
        }
      }
    }
  }
  console.log("✅ Course 2 (Pest Management Techniques) created with 3 modules, 9 lessons");

  // ── 7. ENROLL 5 FARMERS IN COURSE 1 ───────────────────────────────────────
  const course1Lessons = await prisma.lesson.findMany({
    where: { module: { courseId: course1.id } },
    include: { module: true },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });
  const totalLessons = course1Lessons.length;

  const enrollConfigs = [
    { farmer: farmers[0], pct: 0,   completed: 0 },
    { farmer: farmers[1], pct: 33,  completed: Math.floor(totalLessons * 0.33) },
    { farmer: farmers[2], pct: 66,  completed: Math.floor(totalLessons * 0.66) },
    { farmer: farmers[3], pct: 100, completed: totalLessons },
    { farmer: farmers[4], pct: 0,   completed: 0 },
  ];

  for (const c of enrollConfigs) {
    const completedAt = c.pct === 100 ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null;
    const enrollment = await prisma.enrollment.create({
      data: { farmerId: c.farmer.id, courseId: course1.id, progressPercent: c.pct, completedAt },
    });
    for (const lesson of course1Lessons.slice(0, c.completed)) {
      await prisma.lessonProgress.create({
        data: { farmerId: c.farmer.id, lessonId: lesson.id, completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), timeSpentSeconds: Math.floor(Math.random() * 1800) + 300 },
      });
    }
    if (c.pct === 100) {
      await prisma.certificate.create({
        data: { farmerId: c.farmer.id, courseId: course1.id, enrollmentId: enrollment.id, certificateCode: `SOIL-${nanoidSimple(10).toUpperCase()}`, issuedAt: completedAt! },
      });
      console.log(`✅ Certificate issued for ${c.farmer.name}`);
    }
  }
  console.log("✅ Enrollments: 0%, 33%, 66%, 100%, 0% progress states created");

  // ── 8. LLM CONFIG ──────────────────────────────────────────────────────────
  // PLACEHOLDER: Replace "REPLACE_WITH_REAL_KEY" with actual API key
  const encryptedPlaceholder = encryptForSeed("REPLACE_WITH_REAL_KEY");
  await prisma.lLMConfig.upsert({
    where: { singleton: 1 },
    update: {},
    create: { singleton: 1, provider: LLMProvider.ANTHROPIC, modelId: "claude-sonnet-4-20250514", apiKey: encryptedPlaceholder, isActive: true },
  });
  console.log("✅ LLM Config created (PLACEHOLDER — update API key via Admin > AI Settings)");

  // ── 9. FARMER GROUPS ───────────────────────────────────────────────────────
  const groups = [
    { name: "Northern Highlands Farmers", desc: "Potato and pyrethrum cultivators from Northern Province.", region: "Northern Province", members: [farmers[0], farmers[1], farmers[2]] },
    { name: "Eastern Wetland Cultivators", desc: "Wetland rice and vegetable farmers from Eastern Province.", region: "Eastern Province", members: [farmers[3], farmers[4], farmers[5]] },
    { name: "Kigali Peri-Urban Gardeners", desc: "Market gardeners operating near Kigali.", region: "Kigali Province", members: [farmers[6], farmers[7], farmers[8], farmers[9]] },
  ];
  for (const g of groups) {
    const group = await prisma.farmerGroup.create({ data: { name: g.name, description: g.desc, region: g.region, createdById: mbaza.id } });
    await prisma.farmerGroupMembership.createMany({ data: g.members.map((f) => ({ groupId: group.id, farmerId: f.id })) });
  }
  console.log("✅ 3 FarmerGroups created");

  // ── 10. INTERVENTION FLAGS ─────────────────────────────────────────────────
  const flagDefs = [
    { farmerId: farmers[5].id, flagType: FlagType.FLAG_INACTIVE, courseId: course1.id },
    { farmerId: farmers[6].id, flagType: FlagType.FLAG_FAILING,  courseId: course2.id },
    { farmerId: farmers[7].id, flagType: FlagType.FLAG_STALLED,  courseId: course1.id },
  ];
  for (const fd of flagDefs) {
    const flag = await prisma.interventionFlag.create({
      data: { farmerId: fd.farmerId, flagType: fd.flagType, courseId: fd.courseId, notes: "Auto-flagged during system check. Mbaza staff follow-up required." },
    });
    await prisma.notification.create({
      data: {
        userId: mbaza.id, type: NotificationType.INTERVENTION_FLAG,
        title: { en: "Farmer Flagged for Intervention", fr: "Agriculteur signalé", rw: "Umuhinzi aflagiwe" },
        body: { en: `Farmer flagged with type ${fd.flagType}. Please review.`, fr: `Agriculteur signalé: ${fd.flagType}.`, rw: `Umuhinzi aflagiwe: ${fd.flagType}.` },
        relatedEntityType: "InterventionFlag", relatedEntityId: flag.id,
      },
    });
  }
  console.log("✅ 3 Intervention flags created (FLAG_INACTIVE, FLAG_FAILING, FLAG_STALLED)");

  // ── 11. SAMPLE NOTIFICATIONS ───────────────────────────────────────────────
  const allUsers = [admin, trainer1, trainer2, mbaza, ...farmers];
  for (const user of allUsers) {
    await prisma.notification.create({
      data: {
        userId: user.id, type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: { en: "Welcome to TwihugureHub!", fr: "Bienvenue sur TwihugureHub!", rw: "Murakaza neza kuri TwihugureHub!" },
        body: { en: "Your account is set up. Explore courses and start your agricultural learning journey.", fr: "Votre compte est configuré. Explorez les cours et commencez votre parcours d'apprentissage.", rw: "Konti yawe yakorwe. Genzura amasomo uhite utangira urugendo rwo kwiga ubuhinzi." },
      },
    });
  }
  await prisma.notification.create({
    data: {
      userId: trainer1.id, type: NotificationType.COURSE_APPROVED,
      title: { en: "Course Approved", fr: "Cours approuvé", rw: "Isomo ryemejwe" },
      body: { en: "Your course 'Soil Health & Composting' has been approved and published.", fr: "Votre cours a été approuvé et publié.", rw: "Isomo ryawe ryemejwe kandi ryasohotse." },
      relatedEntityType: "Course", relatedEntityId: course1.id,
    },
  });
  await prisma.notification.create({
    data: {
      userId: farmers[3].id, type: NotificationType.QUIZ_PASSED,
      title: { en: "Course Completed! Certificate Ready 🎉", fr: "Cours terminé! Certificat prêt 🎉", rw: "Isomo rirangiye! Impamyabumenyi irategurwa 🎉" },
      body: { en: "You completed 'Soil Health & Composting'. Your certificate is available.", fr: "Vous avez terminé le cours. Votre certificat est disponible.", rw: "Warangije isomo. Impamyabumenyi yawe iragaragara." },
    },
  });
  console.log("✅ Sample notifications created for all users");
  console.log("\n🎉 Database seeding complete!");
  console.log("─────────────────────────────────────────────");
  console.log("👤 Admin:        admin@twihugurehub.rw / Admin@1234");
  console.log("👨‍🏫 Trainer 1:  trainer1@twihugurehub.rw / Trainer@1234");
  console.log("👨‍🏫 Trainer 2:  trainer2@twihugurehub.rw / Trainer@1234");
  console.log("👷 Mbaza Staff: mbaza@twihugurehub.rw / Mbaza@1234");
  console.log("👨‍🌾 Farmers:    farmer1-10@twihugurehub.rw / Farmer@1234");
  console.log("─────────────────────────────────────────────");
  console.log("⚠️  IMPORTANT: Update the LLM API key via Admin > AI Settings!");
}

main().catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
