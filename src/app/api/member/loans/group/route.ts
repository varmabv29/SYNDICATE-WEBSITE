import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const loans = await prisma.loan.findMany({
      include: {
        user: { select: { name: true, username: true } },
        installments: {
          orderBy: { dueDate: "asc" }
        }
      },
      orderBy: { startDate: "desc" }
    });

    return NextResponse.json(loans);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
