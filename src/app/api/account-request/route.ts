import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VM", "VENDOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: Prisma.AccountRequestWhereInput = { status: "PENDING" };
    const candidateSelect = session.user.role === "VM"
      ? {
          id: true,
          nik: true,
          fotoKtp: true,
          jenisSim: true,
          noSim: true,
          fotoSim: true,
          osRequest: { select: { id: true, type: true, jumlah: true, posisi: true, penempatan: true, waktuKerja: true } },
        }
      : { id: true, osRequest: { select: { id: true, type: true, jumlah: true } } };
    if (session.user.role === "VENDOR") {
      where = { requesterId: session.user.id };
    }

    const requests = await prisma.accountRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        handler: { select: { name: true, role: true } },
        candidate: { select: candidateSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Account Request GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone } = body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const request = await prisma.accountRequest.create({
      data: {
        type: "MITRA",
        name,
        email,
        phone,
        vendorId: session.user.vendorId,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Account Request POST error:", error);
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
    const { requestId, status, catatan } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const accountReq = await prisma.accountRequest.findUnique({
      where: { id: requestId },
      include: {
        candidate: {
          include: { osRequest: true },
        },
      },
    });

    if (!accountReq) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    if (accountReq.status !== "PENDING") {
      return NextResponse.json({ error: "Pengajuan ini sudah diproses" }, { status: 409 });
    }

    if (status === "APPROVED") {
      const hashedPassword = await bcrypt.hash("mitra123", 10);
      const userWithEmail = await prisma.user.findUnique({ where: { email: accountReq.email } });
      if (userWithEmail) {
        return NextResponse.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 409 });
      }

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: accountReq.email,
            password: hashedPassword,
            name: accountReq.name,
            role: "MITRA",
            status: "ACTIVE",
            phone: accountReq.phone,
            vendorId: accountReq.vendorId,
          },
        });

        if (accountReq.candidate) {
          if (!accountReq.vendorId) {
            throw new Error("Candidate account request is missing its vendor");
          }
          await tx.mitraProfile.create({
            data: {
              userId: user.id,
              vendorId: accountReq.vendorId,
              nik: accountReq.candidate.nik,
              fotoKtp: accountReq.candidate.fotoKtp,
              posisi: accountReq.candidate.osRequest.posisi,
              penempatan: accountReq.candidate.osRequest.penempatan,
            },
          });
          await tx.candidate.update({
            where: { id: accountReq.candidate.id },
            data: { status: "TERPILIH" },
          });

          const activatedCount = await tx.candidate.count({
            where: {
              osRequestId: accountReq.candidate.osRequestId,
              status: "TERPILIH",
            },
          });
          if (activatedCount >= accountReq.candidate.osRequest.jumlah) {
            await tx.oSRequest.update({
              where: { id: accountReq.candidate.osRequestId },
              data: { status: "COMPLETED" },
            });
          }
        }

        return tx.accountRequest.update({
          where: { id: requestId },
          data: {
            status: "ACTIVATED",
            catatan,
            handlerId: session.user.id,
          },
        });
      });

      return NextResponse.json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (accountReq.candidate) {
        await tx.candidate.update({
          where: { id: accountReq.candidate.id },
          data: { status: "DITOLAK" },
        });
      }
      return tx.accountRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          catatan,
          handlerId: session.user.id,
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Account Request PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
