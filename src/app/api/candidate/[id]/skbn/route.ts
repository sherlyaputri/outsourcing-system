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
    if (!session || !["VENDOR", "VM", "SM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        skbn: true,
        osRequest: {
          select: {
            vendorId: true,
            requesterId: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    if (session.user.role === "VENDOR" && candidate.osRequest.vendorId !== session.user.vendorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (session.user.role === "SM" && candidate.osRequest.requesterId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!candidate.skbn) {
      return NextResponse.json({ error: "Dokumen SKBN belum diunggah." }, { status: 404 });
    }

    const match = candidate.skbn.match(
      /^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/,
    );
    if (!match) {
      return NextResponse.json({ error: "Format dokumen tersimpan tidak valid." }, { status: 500 });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const safeName = `SKBN-${candidate.name.replace(/[\r\n"]/g, "_")}`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Candidate SKBN GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: params.id },
      include: {
        osRequest: {
          select: {
            id: true,
            vendorId: true,
            status: true,
          },
        },
        accountRequest: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!candidate || candidate.osRequest.vendorId !== session.user.vendorId) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan." }, { status: 404 });
    }

    if (candidate.status !== "TERPILIH") {
      return NextResponse.json(
        { error: "SKBN hanya dapat diunggah untuk Mitra OS yang sudah diterima seleksi." },
        { status: 400 },
      );
    }

    if (
      candidate.osRequest.status !== "WAITING_VENDOR_REQUEST" ||
      (candidate.accountRequest && candidate.accountRequest.status !== "WAITING_SELECTION")
    ) {
      return NextResponse.json(
        { error: "SKBN hanya dapat diunggah sebelum pengajuan akun Mitra OS." },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { skbn } = body;
    if (typeof skbn !== "string") {
      return NextResponse.json({ error: "File SKBN tidak valid." }, { status: 400 });
    }

    const match = skbn.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match) {
      return NextResponse.json({ error: "SKBN harus berupa PDF, JPG, atau PNG." }, { status: 400 });
    }

    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length === 0 || buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran SKBN maksimal 5 MB." }, { status: 400 });
    }

    await prisma.candidate.update({
      where: { id: params.id },
      data: { skbn },
    });

    return NextResponse.json({ success: true, id: params.id });
  } catch (error) {
    console.error("Candidate SKBN PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
