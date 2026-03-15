import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export async function GET(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("monthYear"); // optional filter

    const whereClause = monthYear ? { monthYear } : {};

    const expenditures = await prisma.expenditure.findMany({
      where: whereClause,
      orderBy: { date: "desc" }
    });

    return NextResponse.json(expenditures);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { amount, date, monthYear, remarks } = await req.json();

    if (!amount || !date || !monthYear) {
      return NextResponse.json({ error: "Missing required fields (amount, date, monthYear)" }, { status: 400 });
    }

    const expenditure = await prisma.expenditure.create({
      data: {
        amount: parseFloat(amount),
        date: new Date(date),
        monthYear,
        remarks: remarks || null
      }
    });

    return NextResponse.json(expenditure);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
