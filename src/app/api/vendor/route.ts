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

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!vendorId || !reason) {
      return NextResponse.json({ error: "Pilih Vendor dan isi alasan remove." }, { status: 400 });
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: "Alasan maksimal 2.000 karakter." }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, status: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor tidak ditemukan." }, { status: 404 });
    }
    if (vendor.status !== "ACTIVE") {
      return NextResponse.json({ error: "Vendor ini sudah tidak aktif." }, { status: 409 });
    }

    const activeRequests = await prisma.oSRequest.count({
      where: {
        vendorId,
        status: { notIn: ["COMPLETED", "NOT_SELECTED", "REJECTED"] },
      },
    });
    if (activeRequests > 0) {
      return NextResponse.json({
        error: "Vendor masih memiliki Request OS yang berjalan. Selesaikan proses tersebut sebelum melakukan remove.",
      }, { status: 409 });
    }

    const removedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: { status: "INACTIVE", removalReason: reason, removedAt },
      });
      await tx.mitraProfile.updateMany({
        where: { vendorId, status: "ACTIVE" },
        data: { status: "INACTIVE", endDate: removedAt },
      });
      await tx.user.updateMany({
        where: { vendorId, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      });
      return updatedVendor;
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Vendor removal PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
