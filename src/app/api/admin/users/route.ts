import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, username, password, role } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        username,
        passwordHash,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      select: { id: true, name: true, username: true, role: true }
    });

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, name, role, password } = await req.json();

    if (!id) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    const updateData: any = { name, role: role === "ADMIN" ? "ADMIN" : "MEMBER" };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, username: true, role: true }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: "User ID missing" }, { status: 400 });

    // Ensure they don't delete themselves
    if (id === adminEntry.user.id) {
      return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
    }

    // Attempting delete - Prisma handles relation cleanup if cascade is active
    // Alternatively, verify they have no active loans first
    const activeLoans = await prisma.loan.count({
      where: { userId: id, status: "ACTIVE" }
    });

    if (activeLoans > 0) {
      return NextResponse.json({ error: "Cannot delete user with active loans. Settle loans first." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
