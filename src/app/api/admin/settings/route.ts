import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let setting = await prisma.setting.findUnique({ where: { id: "global" } });
    if (!setting) {
      setting = await prisma.setting.create({ data: { id: "global", monthlyPremium: 0 } });
    }
    return NextResponse.json(setting);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { monthlyPremium } = await req.json();
    
    if (typeof monthlyPremium !== 'number' || monthlyPremium < 0) {
      return NextResponse.json({ error: "Invalid premium amount" }, { status: 400 });
    }

    const setting = await prisma.setting.upsert({
      where: { id: "global" },
      update: { monthlyPremium },
      create: { id: "global", monthlyPremium }
    });

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
