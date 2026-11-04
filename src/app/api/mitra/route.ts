import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM", "SM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = { role: "MITRA" };

    if (session.user.role === "VENDOR") {
      where.vendorId = session.user.vendorId;
    }

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    if (vendorId && session.user.role === "VM") {
      where.vendorId = vendorId;
    }

    const mitras = await prisma.user.findMany({
      where,
      include: {
        mitraProfile: true,
        vendor: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(mitras);
  } catch (error) {
    console.error("Mitra GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
