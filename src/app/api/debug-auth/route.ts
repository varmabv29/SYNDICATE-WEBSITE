import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    
    const user = await prisma.user.findUnique({ where: { username: "admin" } });
    if (!user) return NextResponse.json({ error: "No admin user" });

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    return NextResponse.json({
      success: isValid,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      dbUser: user.username,
      secretPrefix: process.env.NEXTAUTH_SECRET?.substring(0, 3) + "..."
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
