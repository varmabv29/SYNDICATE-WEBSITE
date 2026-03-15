import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function GET() {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const premiums = await prisma.premium.findMany({
    include: {
      user: {
        select: { name: true, username: true }
      }
    },
    orderBy: { datePaid: "desc" }
  });

  return NextResponse.json(premiums);
}

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { userId, amount, datePaid } = await req.json();

    if (!userId || !amount) {
      return NextResponse.json({ error: "User ID and amount are required" }, { status: 400 });
    }

    const premium = await prisma.premium.create({
      data: {
        userId,
        amount: parseFloat(amount),
        datePaid: datePaid ? new Date(datePaid) : new Date(),
      },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(premium);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
