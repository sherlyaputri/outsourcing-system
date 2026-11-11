import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string; documentId: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM", "SM", "GM", "COO", "MITRA"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const document = await prisma.mitraDocument.findUnique({
      where: { id: params.documentId },
      select: {
        name: true,
        mimeType: true,
        content: true,
        mitraProfile: {
          select: { userId: true, vendorId: true },
        },
      },
    });

    if (
      !document ||
      document.mitraProfile.userId !== params.id ||
      (session.user.role === "VENDOR" && document.mitraProfile.vendorId !== session.user.vendorId) ||
      (session.user.role === "MITRA" && document.mitraProfile.userId !== session.user.id)
    ) {
      return NextResponse.json({ error: "Dokumen Mitra tidak ditemukan" }, { status: 404 });
    }

    const match = document.content.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return NextResponse.json({ error: "Format dokumen tersimpan tidak valid" }, { status: 500 });
    }

    const safeName = document.name.replace(/[\r\n"]/g, "_");
    return new NextResponse(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Mitra document GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
