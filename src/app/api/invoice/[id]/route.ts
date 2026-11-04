import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      select: { vendorId: true, dokumen: true, dokumenNama: true },
    });

    if (!invoice || (session.user.role === "VENDOR" && invoice.vendorId !== session.user.vendorId)) {
      return NextResponse.json({ error: "Dokumen invoice tidak ditemukan" }, { status: 404 });
    }
    if (!invoice.dokumen || !invoice.dokumenNama) {
      return NextResponse.json({ error: "Dokumen invoice tidak tersedia" }, { status: 404 });
    }

    const match = invoice.dokumen.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return NextResponse.json({ error: "Format dokumen tersimpan tidak valid" }, { status: 500 });
    }

    const safeName = invoice.dokumenNama.replace(/[\r\n"]/g, "_");
    return new NextResponse(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": match[1],
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(invoice.dokumenNama)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Invoice document GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
