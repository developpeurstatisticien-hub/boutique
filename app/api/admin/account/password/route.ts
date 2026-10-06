import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(12).max(128),
});

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const admin = token ? await getAdminSession(token) : null;
  if (!admin) {
    return NextResponse.json({ error: "Session administrateur invalide." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }
    throw error;
  }

  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Le nouveau mot de passe doit contenir entre 12 et 128 caractères." },
      { status: 400 },
    );
  }

  const account = await prisma.adminUser.findUnique({
    where: { id: admin.id },
    select: { passwordHash: true },
  });
  if (!account || !(await compare(parsed.data.currentPassword, account.passwordHash))) {
    return NextResponse.json({ error: "Le mot de passe actuel est incorrect." }, { status: 401 });
  }
  if (await compare(parsed.data.newPassword, account.passwordHash)) {
    return NextResponse.json(
      { error: "Choisissez un mot de passe différent de l’actuel." },
      { status: 400 },
    );
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true });
}
