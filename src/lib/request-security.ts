import { NextRequest } from "next/server";

export function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const originUrl = new URL(origin);
    const secureOrigin = originUrl.protocol === "https:";
    const allowedProtocol = secureOrigin || process.env.NODE_ENV !== "production" && originUrl.protocol === "http:";
    return allowedProtocol && originUrl.host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
