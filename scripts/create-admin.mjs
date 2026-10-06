import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const [emailArgument, password] = process.argv.slice(2);
const email = emailArgument?.trim().toLowerCase();

if (!email || !zEmail(email) || !password || password.length < 12) {
  console.error("Usage: npm run admin:create -- admin@example.com <mot-de-passe-12-caracteres-minimum>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await hash(password, 12);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, role: "OWNER" },
  });
  console.log(`Compte administrateur prêt : ${email}`);
} finally {
  await prisma.$disconnect();
}

function zEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
