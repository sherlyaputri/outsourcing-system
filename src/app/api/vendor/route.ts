import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { encryptInitialPassword, generateInitialPassword } from "@/lib/initial-password";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const vendors = await prisma.vendor.findMany({
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
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action : "REMOVE";
    const vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";

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
