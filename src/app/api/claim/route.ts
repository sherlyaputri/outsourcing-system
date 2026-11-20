import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM", "FINANCE"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};

    if (session.user.role === "VENDOR") {
      where.vendorId = session.user.vendorId;
    }

    const claims = await prisma.claim.findMany({
      where: session.user.role === "VENDOR"
        ? { vendorId: session.user.vendorId || "__none__", invoice: { status: { in: ["PUBLISHED", "PAID"] } } }
        : where,
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
        invoiceId: true,
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
    if (!session || session.user.role !== "FINANCE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { invoiceId, jenisClaim, nominal, catatan } = body;

    if (!invoiceId || typeof jenisClaim !== "string" || !jenisClaim.trim() ||
        typeof nominal !== "number" || !Number.isFinite(nominal) || nominal <= 0) {
      return NextResponse.json({ error: "Data klaim tidak lengkap atau tidak valid" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: String(invoiceId) }, select: { id: true, vendorId: true, bulan: true, status: true } });
    if (!invoice || invoice.status !== "DRAFT") return NextResponse.json({ error: "Klaim hanya dapat ditambahkan ke invoice Draft." }, { status: 409 });

    const claim = await prisma.claim.create({
      data: {
        vendorId: invoice.vendorId,
        invoiceId: invoice.id,
        bulan: invoice.bulan,
        jenisClaim: jenisClaim.trim().slice(0, 120),
        jumlahMitra: 1,
        nominal,
        catatan: typeof catatan === "string" ? catatan.trim().slice(0, 2000) : null,
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ id: claim.id }, { status: 201 });
  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
