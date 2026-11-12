import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const npwp = typeof body.npwp === "string" ? body.npwp.trim() : "";
    const picName = typeof body.picName === "string" ? body.picName.trim() : "";
    const picPhone = typeof body.picPhone === "string" ? body.picPhone.trim() : "";
    const bankAccountName = typeof body.bankAccountName === "string" ? body.bankAccountName.trim() : "";
    const bankAccountNumber = typeof body.bankAccountNumber === "string" ? body.bankAccountNumber.trim() : "";
    const companyTaxStatus = typeof body.companyTaxStatus === "string" ? body.companyTaxStatus.trim() : "";

    if (!name || !email || !password || !address || !npwp || !picName || !picPhone || !bankAccountName || !bankAccountNumber || !companyTaxStatus) {
      return NextResponse.json({ error: "Lengkapi semua data perusahaan dan akun." }, { status: 400 });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    if (!["PKP", "NON_PKP"].includes(companyTaxStatus)) return NextResponse.json({ error: "Status perpajakan perusahaan tidak valid." }, { status: 400 });
    if (companyTaxStatus.length > 100 || npwp.length > 40 || name.length > 200 || picName.length > 200) {
      return NextResponse.json({ error: "Ada data yang melebihi batas panjang." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    const existingVendor = await prisma.vendor.findFirst({ where: { email }, select: { id: true } });
    if (existingVendor) return NextResponse.json({ error: "Email sudah digunakan untuk pendaftaran vendor." }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.create({
        data: {
          name,
          email,
          address,
          phone: picPhone,
          npwp,
          picName,
          picPhone,
          bankAccountName,
          bankAccountNumber,
          companyTaxStatus,
          status: "PENDING",
        },
      });
      await tx.user.create({
        data: {
          name: picName,
          email,
          password: hashedPassword,
          phone: picPhone,
          role: "VENDOR",
          status: "PENDING",
          vendorId: vendor.id,
        },
      });
      return { id: vendor.id, name: vendor.name, status: vendor.status };
    });

    return NextResponse.json({ ...result, message: "Pendaftaran berhasil dikirim dan menunggu persetujuan VM." }, { status: 201 });
  } catch (error) {
    console.error("Vendor registration error:", error);
    return NextResponse.json({ error: "Pendaftaran vendor gagal diproses." }, { status: 500 });
  }
}
