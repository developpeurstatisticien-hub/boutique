import { compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { hasSameOrigin } from "@/lib/request-security";

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Requête non autorisée." }, { status: 403 });
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (
    !admin ||
    !admin.isActive ||
    !(await compare(parsed.data.password, admin.passwordHash))
  ) {
    return NextResponse.json({ error: "E-mail ou mot de passe incorrect." }, { status: 401 });
  }

  const token = await createAdminSession(admin.id);
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
