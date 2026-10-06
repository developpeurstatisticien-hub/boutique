import { cookies } from "next/headers";
import { errors, jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/db";

export const ADMIN_SESSION_COOKIE = "noma_admin_session";

function getSessionKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(adminId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSessionKey());
}

export async function getAdminSession(token: string) {
  let adminId: string;
  try {
    const { payload } = await jwtVerify(token, getSessionKey(), {
      algorithms: ["HS256"],
    });
    if (!payload.sub) return null;
    adminId = payload.sub;
  } catch (error) {
    if (error instanceof errors.JOSEError) return null;
    throw error;
  }

  return prisma.adminUser.findFirst({
    where: { id: adminId, isActive: true },
    select: { id: true, email: true, role: true },
  });
}

export async function getCurrentAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return token ? getAdminSession(token) : null;
}
