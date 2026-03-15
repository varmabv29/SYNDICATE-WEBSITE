import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkAdmin } from "@/lib/auth-utils";

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminEntry = await checkAdmin();
  if (!adminEntry) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let setting = await prisma.setting.findFirst();
    if (!setting) {
      setting = await prisma.setting.create({ data: { monthlyPremium: 0 } });
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

    let setting = await prisma.setting.findFirst();
    if (setting) {
      setting = await prisma.setting.update({
        where: { id: setting.id },
        data: { monthlyPremium }
      });
    } else {
      setting = await prisma.setting.create({
        data: { monthlyPremium }
      });
    }

    return NextResponse.json({ success: true, setting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
