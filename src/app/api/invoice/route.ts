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
      include: {
        vendor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
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
    const { bulan, totalAmount, tanggalJatuhTempo, catatan } = body;

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
        status: "SUBMITTED",
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Invoice POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
