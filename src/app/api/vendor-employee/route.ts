import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const maxImageBytes = 5 * 1024 * 1024;
const maxTotalImageBytes = 15 * 1024 * 1024;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/]+=*)$/);
  return Boolean(match && Buffer.from(match[1], "base64").length <= maxImageBytes);
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availableOnly = new URL(req.url).searchParams.get("available") === "true";
    const employees = await prisma.vendorEmployee.findMany({
      where: {
        vendorId: session.user.vendorId,
        ...(availableOnly ? {
          status: "ACTIVE",
          skck: { not: null },
          candidates: { none: { status: { in: ["KANDIDAT", "TERPILIH"] } } },
        } : {}),
      },
      select: {
        id: true,
        name: true,
        nik: true,
        jenisSim: true,
        noSim: true,
        email: true,
        phone: true,
        alamat: true,
        kelurahan: true,
        kecamatan: true,
        kabKota: true,
        provinsi: true,
        status: true,
        skck: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(employees.map(({ skck, ...employee }) => ({
      ...employee,
      hasSkck: Boolean(skck),
    })));
  } catch (error) {
    console.error("Vendor employee GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    if (!employeeId) {
      return NextResponse.json({ error: "Data karyawan tidak valid." }, { status: 400 });
    }
    const employee = await prisma.vendorEmployee.findFirst({
      where: { id: employeeId, vendorId: session.user.vendorId },
      select: { id: true, skck: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Data karyawan tidak ditemukan." }, { status: 404 });
    }

    const requiredFields = ["name", "nik", "jenisSim", "noSim", "phone", "email", "alamat", "kelurahan", "kecamatan", "kabKota", "provinsi"];
    if (requiredFields.some((field) => !isNonEmptyString(body[field]))) {
      return NextResponse.json({ error: "Semua data karyawan wajib diisi." }, { status: 400 });
    }
    if (!/^\d{16}$/.test(body.nik.trim())) {
      return NextResponse.json({ error: "NIK KTP harus tepat 16 digit angka." }, { status: 400 });
    }
    if (!["A", "B1", "B2", "C", "D"].includes(body.jenisSim)) {
      return NextResponse.json({ error: "Pilih jenis SIM yang tersedia." }, { status: 400 });
    }
    if (!/^\d+$/.test(body.noSim.trim())) {
      return NextResponse.json({ error: "No. SIM hanya boleh berisi angka." }, { status: 400 });
    }
    if (!/^08\d{8,12}$/.test(body.phone.trim())) {
      return NextResponse.json({ error: "No. HP harus berformat 08xxxxxxxxxxxx." }, { status: 400 });
    }
    const normalizedEmail = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Email harus berformat nama@domain.com." }, { status: 400 });
    }
    if (body.skck !== undefined && (
      typeof body.skck !== "string" ||
      !/^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/]+=*$/.test(body.skck) ||
      Buffer.from(body.skck.split(",")[1], "base64").length === 0 ||
      Buffer.from(body.skck.split(",")[1], "base64").length > maxImageBytes
    )) {
      return NextResponse.json({ error: "SKCK harus berupa PDF/JPG/PNG maksimal 5 MB." }, { status: 400 });
    }
    if (!employee.skck && !body.skck) {
      return NextResponse.json({ error: "SKCK wajib diunggah sebelum data karyawan disimpan." }, { status: 400 });
    }
    const duplicate = await prisma.vendorEmployee.findFirst({
      where: {
        vendorId: session.user.vendorId,
        id: { not: employeeId },
        OR: [{ email: normalizedEmail }, { nik: body.nik.trim() }],
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Email atau NIK sudah terdaftar pada data karyawan Vendor ini." }, { status: 409 });
    }

    await prisma.vendorEmployee.update({
      where: { id: employeeId },
      data: {
        name: body.name.trim(),
        nik: body.nik.trim(),
        jenisSim: body.jenisSim,
        noSim: body.noSim.trim(),
        phone: body.phone.trim(),
        email: normalizedEmail,
        alamat: body.alamat.trim(),
        kelurahan: body.kelurahan.trim(),
        kecamatan: body.kecamatan.trim(),
        kabKota: body.kabKota.trim(),
        provinsi: body.provinsi.trim(),
        ...(body.skck ? { skck: body.skck } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Vendor employee PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name, nik, fotoKtp, jenisSim, noSim, fotoSim, phone, email,
      alamat, kelurahan, kecamatan, kabKota, provinsi, skck,
    } = body;

    if (!isNonEmptyString(name)) {
      return NextResponse.json({ error: "Nama karyawan wajib diisi." }, { status: 400 });
    }
    if (typeof nik !== "string" || !/^\d{16}$/.test(nik.trim())) {
      return NextResponse.json({ error: "NIK KTP harus tepat 16 digit angka." }, { status: 400 });
    }
    if (!isValidImage(fotoKtp) || !isValidImage(fotoSim)) {
      return NextResponse.json({ error: "Foto KTP dan SIM wajib berupa JPG/PNG maksimal 5 MB." }, { status: 400 });
    }
    if (
      typeof skck !== "string" ||
      !/^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/]+=*$/.test(skck) ||
      Buffer.from(skck.split(",")[1], "base64").length === 0 ||
      Buffer.from(skck.split(",")[1], "base64").length > maxImageBytes
    ) {
      return NextResponse.json({ error: "SKCK wajib berupa PDF/JPG/PNG maksimal 5 MB." }, { status: 400 });
    }
    if (!["A", "B1", "B2", "C", "D"].includes(jenisSim)) {
      return NextResponse.json({ error: "Pilih jenis SIM yang tersedia." }, { status: 400 });
    }
    if (typeof noSim !== "string" || !/^\d+$/.test(noSim.trim())) {
      return NextResponse.json({ error: "No. SIM hanya boleh berisi angka." }, { status: 400 });
    }
    if (typeof phone !== "string" || !/^08\d{8,12}$/.test(phone.trim())) {
      return NextResponse.json({ error: "No. HP hanya boleh angka dan harus berformat 08xxxxxxxxxxxx." }, { status: 400 });
    }
    if (!isNonEmptyString(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Email harus berformat nama@domain.com." }, { status: 400 });
    }
    if (![alamat, kelurahan, kecamatan, kabKota, provinsi].every(isNonEmptyString)) {
      return NextResponse.json({ error: "Alamat dan wilayah tempat tinggal wajib diisi." }, { status: 400 });
    }

    const totalImageBytes = [fotoKtp, fotoSim, skck].reduce(
      (total, image) => total + Buffer.from(image.split(",")[1], "base64").length,
      0,
    );
    if (totalImageBytes > maxTotalImageBytes) {
      return NextResponse.json({ error: "Total ukuran foto maksimal 15 MB." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEmployee = await prisma.vendorEmployee.findFirst({
      where: {
        vendorId: session.user.vendorId,
        OR: [{ email: normalizedEmail }, { nik: nik.trim() }],
      },
      select: { id: true },
    });
    if (existingEmployee) {
      return NextResponse.json({ error: "Email atau NIK sudah terdaftar pada data karyawan Vendor ini." }, { status: 409 });
    }

    const employee = await prisma.vendorEmployee.create({
      data: {
        vendorId: session.user.vendorId,
        name: name.trim(),
        nik: nik.trim(),
        fotoKtp,
        jenisSim,
        noSim: noSim.trim(),
        fotoSim,
        skck,
        phone: phone.trim(),
        email: normalizedEmail,
        alamat: alamat.trim(),
        kelurahan: kelurahan.trim(),
        kecamatan: kecamatan.trim(),
        kabKota: kabKota.trim(),
        provinsi: provinsi.trim(),
      },
    });
    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Vendor employee POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
