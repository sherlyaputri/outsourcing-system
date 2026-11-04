import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM", "SM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = { role: "MITRA" };

    if (session.user.role === "VENDOR") {
      where.vendorId = session.user.vendorId;
    }

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId");
    if (vendorId && session.user.role === "VM") {
      where.vendorId = vendorId;
    }

    const mitras = await prisma.user.findMany({
      where,
      include: {
        mitraProfile: true,
        vendor: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(mitras);
  } catch (error) {
    console.error("Mitra GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      idMitraOs,
      nik,
      tempatLahir,
      tanggalLahir,
      alamat,
      noBpjs,
      noRekening,
      namaBank,
      penempatan,
      posisi,
    } = body;

    if (typeof idMitraOs !== "string" || !idMitraOs.trim()) {
      return NextResponse.json({ error: "ID Mitra OS wajib diisi" }, { status: 400 });
    }

    // Check mitra belongs to this vendor
    const mitra = await prisma.user.findFirst({
      where: { id: userId, vendorId: session.user.vendorId, role: "MITRA" },
    });

    if (!mitra) {
      return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
    }

    const duplicateId = await prisma.mitraProfile.findFirst({
      where: { idMitraOs: idMitraOs.trim(), userId: { not: userId } },
      select: { id: true },
    });

    if (duplicateId) {
      return NextResponse.json({ error: "ID Mitra OS sudah digunakan" }, { status: 409 });
    }

    const profile = await prisma.mitraProfile.upsert({
      where: { userId },
      update: {
        idMitraOs: idMitraOs.trim(),
        nik, tempatLahir, alamat, noBpjs, noRekening, namaBank, penempatan, posisi,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : undefined,
      },
      create: {
        userId,
        vendorId: session.user.vendorId!,
        idMitraOs: idMitraOs.trim(),
        nik, tempatLahir, alamat, noBpjs, noRekening, namaBank, penempatan, posisi,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : undefined,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Mitra PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
