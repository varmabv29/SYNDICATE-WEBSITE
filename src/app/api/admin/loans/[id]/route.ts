import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const loan = await prisma.loan.findUnique({
      where: { id },
      include: { installments: true }
    });

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    // Admins can only firmly delete ACTIVE loans (to prevent corrupting historical SETTLED data, though this is a business choice)
    if (loan.status !== "ACTIVE") {
      return NextResponse.json({ error: "Only ACTIVE loans can be deleted. Settled loans must remain for history." }, { status: 400 });
    }

    // MongoDB doesn't support cascade deletes — manually delete installments first
    await prisma.installment.deleteMany({ where: { loanId: id } });

    await prisma.loan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Loan deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
