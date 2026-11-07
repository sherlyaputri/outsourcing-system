import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { supportedShifts } from "@/lib/attendance-shift";
import { decryptInitialPassword } from "@/lib/initial-password";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VENDOR", "VM", "SM"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "VENDOR" && !session.user.vendorId) {
      return NextResponse.json({ error: "Akun vendor tidak memiliki vendor terkait." }, { status: 403 });
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
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        phone: true,
        vendorId: true,
        initialPasswordEncrypted: true,
        mitraProfile: {
          select: {
            id: true,
            idMitraOs: true,
            waktuKerja: true,
            posisi: true,
            penempatan: true,
            alamat: true,
            kelurahan: true,
            kecamatan: true,
            kabKota: true,
            provinsi: true,
            fotoKtp: true,
            jenisSim: true,
            noSim: true,
            fotoSim: true,
            skck: true,
            namaBank: true,
            noRekening: true,
            nik: true,
            tempatLahir: true,
            tanggalLahir: true,
            noBpjs: true,
            documents: {
              select: { id: true, name: true, mimeType: true, createdAt: true },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        vendor: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(mitras.map(({ initialPasswordEncrypted, ...mitra }) => ({
      ...mitra,
      ...(session.user.role === "VENDOR" || session.user.role === "VM"
        ? { initialPassword: initialPasswordEncrypted ? decryptInitialPassword(initialPasswordEncrypted) : null }
        : {}),
    })));
  } catch (error) {
    console.error("Mitra GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const maxDocumentBytes = 5 * 1024 * 1024;
const allowedDocumentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maxProfileImageBytes = 5 * 1024 * 1024;

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      userId,
      name,
      email,
      phone,
      waktuKerja,
      tempatLahir,
      tanggalLahir,
      alamat,
      kelurahan,
      kecamatan,
      kabKota,
      provinsi,
      noBpjs,
      noRekening,
      namaBank,
      jenisSim,
      noSim,
      fotoKtp,
      fotoSim,
      skck,
      documents,
    } = body;

    if (typeof userId !== "string" || !userId.trim()) {
      return NextResponse.json({ error: "Mitra tidak valid." }, { status: 400 });
    }
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nama Mitra wajib diisi." }, { status: 400 });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Email harus berformat nama@domain.com." }, { status: 400 });
    }
    if (waktuKerja !== undefined && (
      typeof waktuKerja !== "string" ||
      !supportedShifts.some((shift) => shift === waktuKerja)
    )) {
      return NextResponse.json({ error: "Jadwal shift tidak valid." }, { status: 400 });
    }
    const textFields = [
      phone, tempatLahir, alamat, kelurahan, kecamatan, kabKota, provinsi,
      noBpjs, noRekening, namaBank, jenisSim, noSim,
    ];
    if (textFields.some((value) => value !== undefined && value !== null && typeof value !== "string")) {
      return NextResponse.json({ error: "Format data profil tidak valid." }, { status: 400 });
    }
    if (tanggalLahir && (typeof tanggalLahir !== "string" || Number.isNaN(new Date(tanggalLahir).getTime()))) {
      return NextResponse.json({ error: "Tanggal lahir tidak valid." }, { status: 400 });
    }
    const uploadedImages: { fotoKtp?: string; fotoSim?: string } = {};
    for (const [field, value] of [["fotoKtp", fotoKtp], ["fotoSim", fotoSim]] as const) {
      if (value === undefined) continue;
      if (typeof value !== "string") {
        return NextResponse.json({ error: `Foto ${field === "fotoKtp" ? "KTP" : "SIM"} tidak valid.` }, { status: 400 });
      }
      const match = value.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/]+=*)$/);
      if (!match || Buffer.from(match[1], "base64").length > maxProfileImageBytes) {
        return NextResponse.json({ error: `Foto ${field === "fotoKtp" ? "KTP" : "SIM"} harus JPG/PNG maksimal 5 MB.` }, { status: 400 });
      }
      uploadedImages[field] = value;
    }
    let uploadedSkck: string | undefined;
    if (skck !== undefined) {
      if (typeof skck !== "string") {
        return NextResponse.json({ error: "File SKCK tidak valid." }, { status: 400 });
      }
      const match = skck.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+=*)$/);
      if (!match) {
        return NextResponse.json({ error: "SKCK harus berupa PDF, JPG, atau PNG." }, { status: 400 });
      }
      const size = Buffer.from(match[2], "base64").length;
      if (size === 0 || size > maxDocumentBytes) {
        return NextResponse.json({ error: "Ukuran SKCK maksimal 5 MB." }, { status: 400 });
      }
      uploadedSkck = skck;
    }
    if (documents !== undefined && (!Array.isArray(documents) || documents.length > 10)) {
      return NextResponse.json({ error: "Maksimal 10 dokumen per unggahan." }, { status: 400 });
    }

    const validatedDocuments: { name: string; mimeType: string; content: string }[] = [];
    let totalDocumentBytes = 0;
    for (const document of documents || []) {
      if (!document || typeof document.name !== "string" || typeof document.content !== "string") {
        return NextResponse.json({ error: "Format dokumen tidak valid." }, { status: 400 });
      }
      const match = document.content.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match || !allowedDocumentTypes.has(match[1])) {
        return NextResponse.json({ error: "Dokumen harus berupa PDF, JPG, atau PNG." }, { status: 400 });
      }
      const size = Buffer.from(match[2], "base64").length;
      if (size === 0 || size > maxDocumentBytes) {
        return NextResponse.json({ error: "Ukuran setiap dokumen maksimal 5 MB." }, { status: 400 });
      }
      totalDocumentBytes += size;
      validatedDocuments.push({
        name: document.name.replace(/[\r\n]/g, "_").slice(0, 255),
        mimeType: match[1],
        content: document.content,
      });
    }
    if (totalDocumentBytes > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Total ukuran dokumen maksimal 15 MB per unggahan." }, { status: 400 });
    }

    const mitra = await prisma.user.findFirst({
      where: { id: userId, vendorId: session.user.vendorId, role: "MITRA" },
      include: { mitraProfile: { select: { id: true, waktuKerja: true, skck: true } } },
    });
    if (!mitra) {
      return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    }
    if (!mitra.mitraProfile && !waktuKerja) {
      return NextResponse.json({ error: "Jadwal shift wajib diisi untuk membuat profil Mitra." }, { status: 400 });
    }
    if (!mitra.mitraProfile?.skck && !uploadedSkck) {
      return NextResponse.json({ error: "SKCK wajib diunggah untuk melengkapi data Mitra." }, { status: 400 });
    }
    const existingEmail = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase(), id: { not: userId } },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email sudah digunakan oleh akun lain." }, { status: 409 });
    }

    const profile = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { name: name.trim(), email: email.trim().toLowerCase() },
      });
      if (phone === null || typeof phone === "string") {
        await tx.user.update({ where: { id: userId }, data: { phone: phone?.trim() || null } });
      }

      const profileFields = {
        waktuKerja: waktuKerja ?? undefined,
        tempatLahir: tempatLahir?.trim() || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat: alamat?.trim() || null,
        kelurahan: kelurahan?.trim() || null,
        kecamatan: kecamatan?.trim() || null,
        kabKota: kabKota?.trim() || null,
        provinsi: provinsi?.trim() || null,
        noBpjs: noBpjs?.trim() || null,
        noRekening: noRekening?.trim() || null,
        namaBank: namaBank?.trim() || null,
        jenisSim: jenisSim?.trim() || null,
        noSim: noSim?.trim() || null,
        ...uploadedImages,
        ...(uploadedSkck ? { skck: uploadedSkck } : {}),
      };
      const updatedProfile = await tx.mitraProfile.upsert({
        where: { userId },
        create: {
          userId,
          vendorId: session.user.vendorId!,
          ...profileFields,
          waktuKerja: waktuKerja!,
        },
        update: profileFields,
      });

      if (validatedDocuments.length > 0) {
        await tx.mitraDocument.createMany({
          data: validatedDocuments.map((document) => ({
            ...document,
            mitraProfileId: updatedProfile.id,
          })),
        });
      }

      return updatedProfile;
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Mitra PUT error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
