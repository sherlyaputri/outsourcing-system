import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};

    if (session.user.role === "VENDOR") {
      where.vendorId = session.user.vendorId;
    }

    const claims = await prisma.claim.findMany({
      where,
      include: {
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Claim GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { bulan, jenisClaim, jumlahMitra, nominal, catatan } = body;

    const claim = await prisma.claim.create({
      data: {
        vendorId: session.user.vendorId!,
        bulan,
        jenisClaim,
        jumlahMitra,
        nominal,
        catatan,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
