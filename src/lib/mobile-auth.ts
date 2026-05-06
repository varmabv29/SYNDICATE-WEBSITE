import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

const JWT_SECRET = process.env.NEXTAUTH_SECRET || "fallback-secret";

export interface MobileUser {
  id: string;
  username: string;
  role: string;
  name: string | null;
}

/**
 * Authenticate a request from either:
 * 1. NextAuth session (web browser)
 * 2. Bearer JWT token (mobile app)
 * Returns the user object or null if unauthenticated.
 */
export async function authenticateRequest(
  req?: NextRequest
): Promise<MobileUser | null> {
  // First, try NextAuth session (web)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      id: session.user.id as string,
      username: session.user.username as string,
      role: session.user.role as string,
      name: (session.user.name as string) || null,
    };
  }

  // If no session, try Bearer token (mobile)
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as MobileUser;
        return {
          id: decoded.id,
          username: decoded.username,
          role: decoded.role,
          name: decoded.name || null,
        };
      } catch {
        return null;
      }
    }
  }

  return null;
}
