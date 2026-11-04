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

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        id: true,
        nomorInvoice: true,
        bulan: true,
        totalAmount: true,
        status: true,
        tanggalJatuhTempo: true,
        dokumenNama: true,
        createdAt: true,
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices.map((invoice) => ({
      ...invoice,
      hasDokumen: Boolean(invoice.dokumenNama),
    })));
  } catch (error) {
    console.error("Invoice GET error:", error);
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
    const { bulan, totalAmount, tanggalJatuhTempo, catatan, dokumen, dokumenNama } = body;

    if (typeof bulan !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ||
        typeof totalAmount !== "number" || !Number.isFinite(totalAmount) || totalAmount < 0) {
      return NextResponse.json({ error: "Bulan dan total tagihan tidak valid." }, { status: 400 });
    }

    if (typeof dokumen !== "string" || typeof dokumenNama !== "string" || !dokumenNama.trim()) {
      return NextResponse.json({ error: "File invoice wajib diunggah." }, { status: 400 });
    }

    const fileMatch = dokumen.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!fileMatch) {
      return NextResponse.json({ error: "File invoice harus berupa PDF, JPG, atau PNG." }, { status: 400 });
    }
    const fileSize = Buffer.from(fileMatch[2], "base64").length;
    if (fileSize === 0 || fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file invoice maksimal 5 MB." }, { status: 400 });
    }

    // Generate invoice number
    const count = await prisma.invoice.count();
    const nomorInvoice = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(count + 1).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        vendorId: session.user.vendorId!,
        nomorInvoice,
        bulan,
        totalAmount,
        tanggalJatuhTempo: tanggalJatuhTempo ? new Date(tanggalJatuhTempo) : undefined,
        catatan,
        dokumen,
        dokumenNama: dokumenNama.trim().slice(0, 255),
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({ id: invoice.id }, { status: 201 });
  } catch (error) {
    console.error("Invoice POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
