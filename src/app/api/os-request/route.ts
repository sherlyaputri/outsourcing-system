import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: Prisma.OSRequestWhereInput = {};
    if (session.user.role === "SM") {
      where = { requesterId: session.user.id };
    } else if (session.user.role === "VENDOR") {
      if (!session.user.vendorId) {
        return NextResponse.json({ error: "Akun vendor tidak memiliki vendor terkait" }, { status: 403 });
      }
      where = { vendorId: session.user.vendorId };
    } else if (session.user.role !== "VM") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const candidateSelect: Prisma.CandidateSelect = session.user.role === "SM"
      ? {
          id: true,
          name: true,
          email: true,
          phone: true,
          nik: true,
          fotoKtp: true,
          jenisSim: true,
          noSim: true,
          fotoSim: true,
          skck: true,
          alamat: true,
          kelurahan: true,
          kecamatan: true,
          kabKota: true,
          provinsi: true,
          status: true,
          alasanKeputusan: true,
          accountRequest: { select: { status: true } },
        }
      : {
          id: true,
          name: true,
          email: true,
          status: true,
          accountRequest: { select: { status: true } },
        };

    const requests = await prisma.oSRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        vendor: { select: { name: true } },
        approvals: {
          include: { approver: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        candidates: {
          select: candidateSelect,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("OS Request GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      jumlah,
      idMitraOs,
      posisi,
      penempatan,
      waktuKerja,
      alasan,
    } = body;

    if (!type || !["PENAMBAHAN", "PERGANTIAN", "PENGURANGAN"].includes(type)) {
      return NextResponse.json({ error: "Tipe request tidak valid" }, { status: 400 });
    }

    if (!Number.isInteger(jumlah) || jumlah < 1) {
      return NextResponse.json({ error: "Jumlah harus minimal 1" }, { status: 400 });
    }

    const needsMitraId = type === "PERGANTIAN" || type === "PENGURANGAN";
    if (needsMitraId && (!idMitraOs || !String(idMitraOs).trim())) {
      return NextResponse.json({ error: "ID Mitra OS wajib untuk permintaan Pergantian atau Pengurangan" }, { status: 400 });
    }

    if (needsMitraId) {
      const mitraProfile = await prisma.mitraProfile.findFirst({
        where: {
          idMitraOs: String(idMitraOs).trim(),
          user: { role: "MITRA", status: "ACTIVE" },
        },
        select: { id: true },
      });

      if (!mitraProfile) {
        return NextResponse.json({ error: "ID Mitra OS tidak ditemukan atau tidak aktif" }, { status: 400 });
      }
    }

    const allowedPositions = [
      "OS001: Sorter",
      "OS002: Driver Delivery & Pickup",
      "OS003: Kurir Perpaket",
      "OS004: Kurir Dedicated",
      "OS005: Driver Ondemand",
    ];
    const allowedWorkHours = ["08:00-17:00", "20:00-05:00"];

    if (!allowedPositions.includes(posisi)) {
      return NextResponse.json({ error: "Posisi kebutuhan tidak valid" }, { status: 400 });
    }

    if (!allowedWorkHours.includes(waktuKerja)) {
      return NextResponse.json({ error: "Waktu kerja tidak valid" }, { status: 400 });
    }

    if (!["kantor1", "kantor2", "kantor3"].includes(penempatan)) {
      return NextResponse.json({ error: "Kode kantor tidak valid" }, { status: 400 });
    }

    const osRequest = await prisma.oSRequest.create({
      data: {
        type,
        jumlah,
        idMitraOs: needsMitraId ? String(idMitraOs).trim() : null,
        idPergantian: type === "PERGANTIAN" ? String(idMitraOs).trim() : null,
        posisi,
        penempatan,
        waktuKerja,
        alasan,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    // If PENAMBAHAN, create GM approval
    if (type === "PENAMBAHAN") {
      const gmUsers = await prisma.user.findMany({ where: { role: "GM", status: "ACTIVE" } });
      for (const gm of gmUsers) {
        await prisma.approval.create({
          data: {
            osRequestId: osRequest.id,
            approverId: gm.id,
            creatorId: session.user.id,
            level: "GM",
            status: "PENDING",
          },
        });
      }
    } else {
      // PERGANTIAN or PENGURANGAN goes directly to VM for vendor selection
      await prisma.oSRequest.update({
        where: { id: osRequest.id },
        data: { status: "APPROVED_COO" }, // skip approval, go to VM
      });
    }

    return NextResponse.json(osRequest);
  } catch (error) {
    console.error("OS Request POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
