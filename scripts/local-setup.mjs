import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, ".env");
const composePath = join(root, "compose.local.yaml");
const isWindows = process.platform === "win32";
const docker = isWindows ? "docker.exe" : "docker";
const prismaCli = join(root, "node_modules", "prisma", "build", "index.js");

if (!existsSync(composePath)) {
  throw new Error("Le fichier compose.local.yaml est introuvable.");
}

if (!existsSync(envPath)) {
  copyFileSync(join(root, ".env.example"), envPath, { errorOnExist: true });
  console.log("Fichier .env créé à partir de .env.example.");
} else {
  const backupPath = `${envPath}.backup-local-${new Date()
    .toISOString()
    .replaceAll(/[:.]/g, "-")}`;
  copyFileSync(envPath, backupPath);
  console.log(`Ancienne configuration sauvegardée dans ${backupPath}.`);
}

const values = readEnv(envPath);
const localPassword =
  values.LOCAL_POSTGRES_PASSWORD || randomBytes(24).toString("hex");
const databaseUrl = `postgresql://noma_local:${localPassword}@localhost:54329/noma?schema=public`;
const generatedPassword = randomBytes(24).toString("base64url");

writeEnv(envPath, {
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  SESSION_SECRET:
    values.SESSION_SECRET && values.SESSION_SECRET.length >= 32 &&
    !values.SESSION_SECRET.includes("replace-with")
      ? values.SESSION_SECRET
      : randomBytes(32).toString("hex"),
  LOCAL_POSTGRES_PASSWORD: localPassword,
  LOCAL_MEDIA_STORAGE: "true",
  PAYMENT_BANKILY_NUMBER:
    values.PAYMENT_BANKILY_NUMBER || "+222 41 64 99 04",
  PAYMENT_MASRVI_NUMBER:
    values.PAYMENT_MASRVI_NUMBER || "+222 41 64 99 04",
  PAYMENT_SEDAD_NUMBER:
    values.PAYMENT_SEDAD_NUMBER || "+222 41 64 99 04",
});

const childEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  LOCAL_POSTGRES_PASSWORD: localPassword,
  LOCAL_MEDIA_STORAGE: "true",
};

const compose = ["compose", "-f", composePath];
run(docker, ["info", "--format", "{{.ServerVersion}}"]);
run(docker, [...compose, "up", "-d", "postgres"], childEnv);

console.log("Attente du démarrage de PostgreSQL…");
await waitForServices(docker, compose, childEnv);

run(process.execPath, [prismaCli, "db", "push", "--schema=./schema.prisma", "--skip-generate"], childEnv);
run(process.execPath, [join(root, "scripts", "seed-local.mjs")], childEnv);
run(
  process.execPath,
  [
    join(root, "scripts", "create-admin.mjs"),
    "admin@noma.local",
    generatedPassword,
  ],
  childEnv,
);

console.log("\nConfiguration locale terminée.");
console.log("Lancement : npm run dev");
console.log("Boutique : http://localhost:3000/boutique (catalogue de démonstration)");
console.log("Administration : http://localhost:3000/admin/connexion");
console.log("Identifiant administrateur : admin@noma.local");
console.log(`Mot de passe initial (à conserver et changer après connexion) : ${generatedPassword}`);
console.log("Le mot de passe est affiché uniquement dans ce terminal.");
console.log("Ne faites aucun transfert d’argent réel pendant les essais.");

function readEnv(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2]
      .trim()
      .replace(/^(['"])(.*)\1$/, "$2");
  }
  return result;
}

function writeEnv(path, updates) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  const updated = new Set();
  const output = lines.map((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match || !(match[1] in updates)) return line;
    updated.add(match[1]);
    return `${match[1]}=${JSON.stringify(updates[match[1]])}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!updated.has(key)) output.push(`${key}=${JSON.stringify(value)}`);
  }
  writeFileSync(path, `${output.join("\n").replace(/\n+$/, "")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function run(command, args, env = process.env) {
  execFileSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
}

async function waitForServices(command, composeArgs, env) {
  const deadline = Date.now() + 120_000;
  let lastError;

  while (Date.now() < deadline) {
    try {
      execFileSync(command, [...composeArgs, "exec", "-T", "postgres", "pg_isready", "-U", "noma_local", "-d", "noma"], {
        cwd: root,
        env,
        stdio: "ignore",
        windowsHide: true,
      });
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    "Les services locaux ne sont pas prêts après 2 minutes. Vérifiez Docker Desktop et relancez npm run local:setup.",
    { cause: lastError },
  );
}
