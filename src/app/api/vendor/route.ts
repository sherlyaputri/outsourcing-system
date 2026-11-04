import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendors = await prisma.vendor.findMany({
      include: {
        _count: {
          select: { users: { where: { role: "MITRA" } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error("Vendor GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

