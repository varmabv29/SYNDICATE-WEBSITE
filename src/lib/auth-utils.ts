import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";

export async function getAuthSession() {
  return await getServerSession(authOptions);
}

export async function checkAdmin() {
  const session = await getAuthSession();
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function checkMember() {
  const session = await getAuthSession();
  if (!session || !session.user) {
    return null;
  }
  return session;
}
