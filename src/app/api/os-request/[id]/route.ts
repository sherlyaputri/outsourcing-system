import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, vendorId, status, catatan } = body;

    const osRequest = await prisma.oSRequest.findUnique({
      where: { id: params.id },
      include: { approvals: true },
    });

    if (!osRequest) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    // VM selects vendor
    if (action === "SELECT_VENDOR" && session.user.role === "VM") {
      const updated = await prisma.oSRequest.update({
        where: { id: params.id },
        data: { vendorId, status: "VENDOR_SELECTED" },
      });
      return NextResponse.json(updated);
    }

    // Update status
    if (status) {
      const updated = await prisma.oSRequest.update({
        where: { id: params.id },
        data: { status, catatan },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("OS Request PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
