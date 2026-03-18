import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const memberEntry = await checkMember();
  if (!memberEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const loanRequest = await prisma.loanRequest.findUnique({
      where: { id }
    });

    if (!loanRequest) {
      return NextResponse.json({ error: "Loan request not found" }, { status: 404 });
    }

    if (loanRequest.userId !== memberEntry.user.id) {
      return NextResponse.json({ error: "You can only delete your own loan requests" }, { status: 403 });
    }

    await prisma.loanRequest.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
