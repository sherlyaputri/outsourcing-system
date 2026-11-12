import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { decryptInitialPassword, encryptInitialPassword, generateInitialPassword } from "@/lib/initial-password";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = session.user.role === "VENDOR"
      ? session.user.vendorId ? { id: session.user.vendorId } : { id: "__missing_vendor__" }
      : {};

    if (session.user.role === "VM") {
      const vendors = await prisma.vendor.findMany({
        where,
        include: {
          _count: {
            select: { users: { where: { role: "MITRA" } } },
          },
          users: {
            where: { role: "VENDOR" },
            select: { email: true, initialPasswordEncrypted: true },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(vendors.map(({ users, ...vendor }) => {
        const vendorUser = users[0] ?? null;
        return {
          ...vendor,
          initialUsername: vendorUser?.email || vendor.email || null,
          initialPassword: vendorUser?.initialPasswordEncrypted
            ? decryptInitialPassword(vendorUser.initialPasswordEncrypted)
            : null,
        };
      }));
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: {
          select: { users: { where: { role: "MITRA" } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(vendors);
  } catch (error) {
    console.error("Vendor GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "REMOVE";
    const vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";

    if (session?.user.role === "VENDOR" && action === "UPDATE_PROFILE") {
      if (!session.user.vendorId) return NextResponse.json({ error: "Akun vendor tidak terhubung ke data perusahaan." }, { status: 403 });
      const name = typeof body.name === "string" ? body.name.trim() : "";
      const address = typeof body.address === "string" ? body.address.trim() : "";
      const npwp = typeof body.npwp === "string" ? body.npwp.trim() : "";
      const picName = typeof body.picName === "string" ? body.picName.trim() : "";
      const picPhone = typeof body.picPhone === "string" ? body.picPhone.trim() : "";
      const bankAccountName = typeof body.bankAccountName === "string" ? body.bankAccountName.trim() : "";
      const bankAccountNumber = typeof body.bankAccountNumber === "string" ? body.bankAccountNumber.trim() : "";
      const companyTaxStatus = typeof body.companyTaxStatus === "string" ? body.companyTaxStatus.trim() : "";
      if (!name || !address || !npwp || !picName || !picPhone || !bankAccountName || !bankAccountNumber || !companyTaxStatus) {
        return NextResponse.json({ error: "Lengkapi semua data perusahaan dan PIC." }, { status: 400 });
      }
      if (!["PKP", "NON_PKP"].includes(companyTaxStatus)) return NextResponse.json({ error: "Status perpajakan perusahaan tidak valid." }, { status: 400 });
      if (name.length > 200 || npwp.length > 40 || picName.length > 200 || companyTaxStatus.length > 100) {
        return NextResponse.json({ error: "Ada data yang melebihi batas panjang." }, { status: 400 });
      }
      const vendor = await prisma.$transaction(async (tx) => {
        const updatedVendor = await tx.vendor.update({
          where: { id: session.user.vendorId! },
          data: { name, address, phone: picPhone, npwp, picName, picPhone, bankAccountName, bankAccountNumber, companyTaxStatus },
        });
        await tx.user.updateMany({
          where: { vendorId: session.user.vendorId!, role: "VENDOR" },
          data: { name: picName, phone: picPhone },
        });
        return updatedVendor;
      });
      return NextResponse.json(vendor);
    }

    if (!session || session.user.role !== "VM") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "APPROVE") {
      if (!vendorId) return NextResponse.json({ error: "Pilih vendor yang akan diaktifkan." }, { status: 400 });
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return NextResponse.json({ error: "Vendor tidak ditemukan." }, { status: 404 });
      if (vendor.status !== "PENDING") return NextResponse.json({ error: "Vendor ini tidak sedang menunggu persetujuan." }, { status: 409 });
      if (!vendor.email) return NextResponse.json({ error: "Email akun vendor belum tersedia." }, { status: 409 });

      const existingUser = await prisma.user.findUnique({ where: { email: vendor.email } });
      if (existingUser && (existingUser.role !== "VENDOR" || (existingUser.vendorId && existingUser.vendorId !== vendor.id))) {
        return NextResponse.json({ error: "Email vendor sudah digunakan oleh akun lain." }, { status: 409 });
      }
      if (existingUser?.status === "ACTIVE") {
        const updatedVendor = await prisma.$transaction(async (tx) => {
          await tx.user.update({ where: { id: existingUser.id }, data: { vendorId: vendor.id } });
          return tx.vendor.update({ where: { id: vendor.id }, data: { status: "ACTIVE" } });
        });
        return NextResponse.json({ vendor: updatedVendor, initialPassword: null });
      }
      const initialPassword = generateInitialPassword();
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      const initialPasswordEncrypted = encryptInitialPassword(initialPassword);
      const result = await prisma.$transaction(async (tx) => {
        if (existingUser) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: { name: existingUser.name || vendor.name, password: hashedPassword, initialPasswordEncrypted, role: "VENDOR", status: "ACTIVE", phone: vendor.phone, vendorId: vendor.id },
          });
        } else {
          await tx.user.create({
            data: { name: vendor.name, email: vendor.email!, password: hashedPassword, initialPasswordEncrypted, role: "VENDOR", status: "ACTIVE", phone: vendor.phone, vendorId: vendor.id },
          });
        }
        const updatedVendor = await tx.vendor.update({ where: { id: vendor.id }, data: { status: "ACTIVE" } });
        return { vendor: updatedVendor, initialPassword };
      });
      return NextResponse.json(result);
    }

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!vendorId || !reason) {
      return NextResponse.json({ error: "Pilih Vendor dan isi alasan remove." }, { status: 400 });
    }
    if (reason.length > 2000) {
      return NextResponse.json({ error: "Alasan maksimal 2.000 karakter." }, { status: 400 });
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      select: { id: true, status: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor tidak ditemukan." }, { status: 404 });
    }
    if (vendor.status !== "ACTIVE") {
      return NextResponse.json({ error: "Vendor ini sudah tidak aktif." }, { status: 409 });
    }

    const activeRequests = await prisma.oSRequest.count({
      where: {
        vendorId,
        status: { notIn: ["COMPLETED", "NOT_SELECTED", "REJECTED"] },
      },
    });
    if (activeRequests > 0) {
      return NextResponse.json({
        error: "Vendor masih memiliki Request OS yang berjalan. Selesaikan proses tersebut sebelum melakukan remove.",
      }, { status: 409 });
    }

    const removedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const updatedVendor = await tx.vendor.update({
        where: { id: vendorId },
        data: { status: "INACTIVE", removalReason: reason, removedAt },
      });
      await tx.mitraProfile.updateMany({
        where: { vendorId, status: "ACTIVE" },
        data: { status: "INACTIVE", endDate: removedAt },
      });
      await tx.user.updateMany({
        where: { vendorId, status: "ACTIVE" },
        data: { status: "INACTIVE" },
      });
      return updatedVendor;
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Vendor removal PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
