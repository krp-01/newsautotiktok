import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../src/lib/database";

const prisma = createPrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.user.upsert({
    where: { email: "admin@newsauto.local" },
    update: { passwordHash, name: "Administrator", role: "ADMIN" },
    create: {
      email: "admin@newsauto.local",
      passwordHash,
      name: "Administrator",
      role: "ADMIN",
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      publicationName: "NewsAutoTikTok",
      defaultHashtags: "#stiri #news #romania #tiktok",
      autoPosting: false,
      autoApprove: false,
      fetchIntervalMinutes: 60,
      videoTemplateStyle: "BOLD",
      watermarkEnabled: true,
    },
  });

  console.log("Seed completed:");
  console.log("  Admin: admin@newsauto.local / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
