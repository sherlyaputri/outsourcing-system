import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { osRequestId, candidates } = body;

    // Verify the OS request is assigned to this vendor
    const osRequest = await prisma.oSRequest.findFirst({
      where: { id: osRequestId, vendorId: session.user.vendorId },
    });

    if (!osRequest) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    const created = await prisma.candidate.createMany({
      data: candidates.map((c: any) => ({
        osRequestId,
        name: c.name,
        nik: c.nik,
        phone: c.phone,
        status: "KANDIDAT",
      })),
    });

    await prisma.oSRequest.update({
      where: { id: osRequestId },
      data: { status: "IN_PROGRESS" },
    });

    return NextResponse.json({ count: created.count });
  } catch (error) {
    console.error("Candidate POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
