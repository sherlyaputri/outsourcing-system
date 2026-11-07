import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: {
        vendorId: true,
        dokumen: true,
        dokumenNama: true,
        buktiTransfer: true,
        buktiTransferNama: true,
      },
    });

    if (!invoice || (session.user.role === "VENDOR" && invoice.vendorId !== session.user.vendorId)) {
      return NextResponse.json({ error: "Dokumen invoice tidak ditemukan" }, { status: 404 });
    }
    const isTransferProof = new URL(req.url).searchParams.get("type") === "transfer";
    const document = isTransferProof ? invoice.buktiTransfer : invoice.dokumen;
    const documentName = isTransferProof ? invoice.buktiTransferNama : invoice.dokumenNama;
    if (!document || !documentName) {
      return NextResponse.json({ error: "Dokumen invoice tidak tersedia" }, { status: 404 });
    }

    const match = document.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return NextResponse.json({ error: "Format dokumen tersimpan tidak valid" }, { status: 500 });
    }

    const safeName = documentName.replace(/[\r\n"]/g, "_");
    return new NextResponse(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": match[1],
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(documentName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice document GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (typeof body.buktiTransfer !== "string" || typeof body.buktiTransferNama !== "string") {
      return NextResponse.json({ error: "Bukti transfer wajib diunggah." }, { status: 400 });
    }
    const fileMatch = body.buktiTransfer.match(
      /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!fileMatch) {
      return NextResponse.json({ error: "Bukti transfer harus berupa PDF, JPG, atau PNG." }, { status: 400 });
    }
    const fileSize = Buffer.from(fileMatch[2], "base64").length;
    if (fileSize === 0 || fileSize > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran bukti transfer maksimal 5 MB." }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
    }
    if (invoice.status === "PAID") {
      return NextResponse.json({ error: "Invoice ini sudah dibayar." }, { status: 409 });
    }

    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        buktiTransfer: body.buktiTransfer,
        buktiTransferNama: body.buktiTransferNama.replace(/[\r\n]/g, "_").slice(0, 255),
        status: "PAID",
      },
      select: { id: true, status: true, buktiTransferNama: true },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Invoice payment proof PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
