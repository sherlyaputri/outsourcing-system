import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};

    if (session.user.role === "VENDOR") {
      where.vendorId = session.user.vendorId;
    }

    const claims = await prisma.claim.findMany({
      where,
      select: {
        id: true,
        vendorId: true,
        bulan: true,
        jenisClaim: true,
        jumlahMitra: true,
        nominal: true,
        status: true,
        catatan: true,
        dokumenNama: true,
        createdAt: true,
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(claims.map((claim) => ({
      ...claim,
      hasDokumen: Boolean(claim.dokumenNama),
    })));
  } catch (error) {
    console.error("Claim GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vendorId, bulan, jenisClaim, jumlahMitra, nominal, catatan, dokumen, dokumenNama } = body;

    if (!vendorId || !bulan || !jenisClaim || !Number.isInteger(jumlahMitra) || jumlahMitra < 1 ||
        typeof nominal !== "number" || !Number.isFinite(nominal) || nominal < 0) {
      return NextResponse.json({ error: "Data klaim tidak lengkap atau tidak valid" }, { status: 400 });
    }

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, status: "ACTIVE" },
      select: { id: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor tidak ditemukan atau tidak aktif" }, { status: 400 });
    }

    if (typeof dokumen !== "string" || typeof dokumenNama !== "string") {
      return NextResponse.json({ error: "Dokumen klaim wajib diunggah" }, { status: 400 });
    }

    const fileMatch = dokumen.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!fileMatch) {
      return NextResponse.json({ error: "Dokumen harus berupa PDF, JPG, atau PNG" }, { status: 400 });
    }

    const fileSize = Buffer.from(fileMatch[2], "base64").length;
    if (fileSize === 0 || fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran dokumen maksimal 5 MB" }, { status: 400 });
    }

    const claim = await prisma.claim.create({
      data: {
        vendorId,
        bulan,
        jenisClaim,
        jumlahMitra,
        nominal,
        catatan,
        dokumen,
        dokumenNama: dokumenNama.slice(0, 255),
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ id: claim.id }, { status: 201 });
  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
