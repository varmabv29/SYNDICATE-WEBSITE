import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";

export async function GET() {
  const session = await checkMember();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const pendingRequests = await prisma.loanRequest.findMany({
      where: {
        status: "PENDING"
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      requests: pendingRequests,
      currentUserId: session.user.id
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
