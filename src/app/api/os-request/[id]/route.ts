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
    const { action, vendorId } = body;

    const osRequest = await prisma.oSRequest.findUnique({
      where: { id: params.id },
      include: { approvals: true },
    });

    if (!osRequest) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    // VM selects vendor
    if (action === "SELECT_VENDOR" && session.user.role === "VM" && osRequest.type === "PENAMBAHAN") {
      if (osRequest.status !== "APPROVED_COO" || !vendorId) {
        return NextResponse.json({ error: "Request belum siap dipilihkan vendor" }, { status: 400 });
      }

      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, status: "ACTIVE" },
        select: { id: true },
      });

      if (!vendor) {
        return NextResponse.json({ error: "Vendor tidak ditemukan atau tidak aktif" }, { status: 400 });
      }

      const updated = await prisma.oSRequest.update({
        where: { id: params.id },
        data: {
          vendorId,
          status: "VENDOR_SELECTED",
        },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch (error) {
    console.error("OS Request PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
