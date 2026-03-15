import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { amount, date, monthYear, remarks } = body;

    const updated = await prisma.expenditure.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(monthYear !== undefined && { monthYear }),
        ...(remarks !== undefined && { remarks }),
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    await prisma.expenditure.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Expenditure deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
