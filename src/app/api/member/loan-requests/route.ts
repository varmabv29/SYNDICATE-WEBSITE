import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkMember } from "@/lib/auth-utils";

export async function POST(req: Request) {
  const memberEntry = await checkMember();
  if (!memberEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { amount, monthYear, durationMonths, priority, remarks } = await req.json();

    if (!amount || !monthYear || !durationMonths || !priority) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const loanRequest = await prisma.loanRequest.create({
      data: {
        userId: memberEntry.user.id,
        amount: parseFloat(amount),
        monthYear,
        durationMonths: parseInt(durationMonths, 10),
        priority,
        remarks: remarks || "",
      }
    });

    return NextResponse.json(loanRequest);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
