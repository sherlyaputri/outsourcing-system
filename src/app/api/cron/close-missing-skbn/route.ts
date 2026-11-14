import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await prisma.user.updateMany({
    where: {
      role: "MITRA",
      status: "ACTIVE",
      mitraProfile: { is: { skbnDeadlineAt: { lte: new Date() }, documents: { none: { name: "SKBN" } } } },
    },
    data: { status: "CLOSED" },
  });
  return NextResponse.json({ closedAccounts: result.count });
}
