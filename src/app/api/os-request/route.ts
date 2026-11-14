import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { MitraRosterDataIncompleteError, returnMitraToRoster } from "@/lib/mitra-roster";

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
    } else if (session.user.role === "VM") {
      where = { status: { not: "REJECTED" } };
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const candidateSelect: Prisma.CandidateSelect = session.user.role === "SM"
      ? {
          id: true,
          name: true,
          email: true,
          phone: true,
          nik: true,
          jenisSim: true,
          noSim: true,
          alamat: true,
          kelurahan: true,
          kecamatan: true,
          kabKota: true,
          provinsi: true,
          domisiliSesuaiKtp: true,
          domisiliAlamat: true,
          domisiliKelurahan: true,
          domisiliKecamatan: true,
          domisiliKabKota: true,
          domisiliProvinsi: true,
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

    const response = requests.map((request) => ({
      ...request,
      candidates: request.candidates,
    }));

    return NextResponse.json(response);
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

    if (jumlah > 10) {
      return NextResponse.json({ error: "Jumlah maksimal 10 mitra dalam satu request." }, { status: 400 });
    }

    const needsMitraId = type === "PERGANTIAN" || type === "PENGURANGAN";
    if (typeof alasan !== "string" || !alasan.trim()) {
      return NextResponse.json({ error: "Alasan permintaan wajib diisi." }, { status: 400 });
    }
    if (alasan.length > 2000) {
      return NextResponse.json({ error: "Alasan maksimal 2.000 karakter." }, { status: 400 });
    }
    const mitraOsIds = needsMitraId
      ? Array.isArray(body.mitraOsIds)
        ? body.mitraOsIds.filter((id: unknown): id is string => typeof id === "string").map((id: string) => id.trim())
        : typeof idMitraOs === "string" ? [idMitraOs.trim()] : []
      : [];
    if (needsMitraId && (mitraOsIds.length !== jumlah || mitraOsIds.some((id: string) => !id))) {
      return NextResponse.json({ error: "Pilih satu ID Mitra OS untuk setiap mitra yang dikurangi atau diganti." }, { status: 400 });
    }
    if (new Set(mitraOsIds).size !== mitraOsIds.length) {
      return NextResponse.json({ error: "ID Mitra OS yang sama tidak boleh dipilih lebih dari sekali." }, { status: 400 });
    }

    const targetProfiles = needsMitraId
      ? await prisma.mitraProfile.findMany({
          where: {
            idMitraOs: { in: mitraOsIds },
            status: "ACTIVE",
            user: { role: "MITRA", status: "ACTIVE" },
          },
          include: { user: { select: { vendorId: true } } },
        })
      : [];
    if (needsMitraId && targetProfiles.length !== mitraOsIds.length) {
      return NextResponse.json({ error: "Salah satu ID Mitra OS tidak ditemukan atau sudah tidak aktif." }, { status: 400 });
    }
    type TargetProfile = Prisma.MitraProfileGetPayload<{
      include: { user: { select: { vendorId: true } } };
    }>;
    const profilesByMitraId = new Map<string, TargetProfile>();
    targetProfiles.forEach((profile: TargetProfile) => {
      if (profile.idMitraOs) profilesByMitraId.set(profile.idMitraOs, profile);
    });
    const orderedTargetProfiles: TargetProfile[] = mitraOsIds.map((mitraOsId: string) => {
      const profile = profilesByMitraId.get(mitraOsId);
      if (!profile) throw new Error(`Mitra profile for ${mitraOsId} was not found`);
      return profile;
    });

    const targetVendorId = orderedTargetProfiles[0]?.user.vendorId;
    if (needsMitraId && (!targetVendorId || orderedTargetProfiles.some((profile) => profile.user.vendorId !== targetVendorId))) {
      return NextResponse.json({ error: "Semua mitra dalam satu request harus berasal dari Vendor yang sama." }, { status: 400 });
    }
    if (needsMitraId && (
      !["kantor1", "kantor2", "kantor3"].includes(penempatan)
      || orderedTargetProfiles.some((profile) => profile.penempatan !== penempatan)
    )) {
      return NextResponse.json({ error: "Pilih kode kantor yang sesuai dengan semua mitra yang dipilih." }, { status: 400 });
    }
    const targetPlacements = new Set(orderedTargetProfiles.map((profile) => profile.penempatan));
    if (needsMitraId && targetPlacements.size > 1) {
      return NextResponse.json({ error: "Wilayah operasional semua mitra yang dipilih harus sama dalam satu request." }, { status: 400 });
    }

    const allowedPositions = [
      "OS001: Sorter",
      "OS002: Driver Delivery & Pickup",
      "OS003: Kurir Perpaket",
      "OS004: Kurir Dedicated",
      "OS005: Driver Ondemand",
    ];
    const allowedWorkHours = ["08:00-17:00", "20:00-05:00"];

    if (!needsMitraId && !allowedPositions.includes(posisi)) {
      return NextResponse.json({ error: "Posisi kebutuhan tidak valid" }, { status: 400 });
    }

    if (!needsMitraId && !allowedWorkHours.includes(waktuKerja)) {
      return NextResponse.json({ error: "Waktu kerja tidak valid" }, { status: 400 });
    }

    if (!needsMitraId && !["kantor1", "kantor2", "kantor3"].includes(penempatan)) {
      return NextResponse.json({ error: "Kode kantor tidak valid" }, { status: 400 });
    }

    const effectivePosition = needsMitraId ? orderedTargetProfiles[0].posisi : posisi;
    const effectivePlacement = needsMitraId ? orderedTargetProfiles[0].penempatan : penempatan;
    const effectiveWorkHours = needsMitraId ? orderedTargetProfiles[0].waktuKerja : waktuKerja;

    const osRequest = await prisma.$transaction(async (tx) => {
      const request = await tx.oSRequest.create({
        data: {
          type,
          jumlah,
          idMitraOs: needsMitraId ? mitraOsIds[0] : null,
          mitraTargets: needsMitraId ? orderedTargetProfiles.map((profile) => profile.id) : Prisma.JsonNull,
          idPergantian: type === "PERGANTIAN" ? mitraOsIds[0] : null,
          posisi: effectivePosition,
          penempatan: effectivePlacement,
          waktuKerja: effectiveWorkHours,
          alasan: alasan.trim(),
          requesterId: session.user.id,
          vendorId: targetVendorId || null,
          vendorNotifiedAt: targetVendorId ? new Date() : null,
          status: type === "PENAMBAHAN" ? "PENDING" : type === "PERGANTIAN" ? "VENDOR_SELECTED" : "COMPLETED",
        },
      });
      if (type === "PENGURANGAN") {
        for (const profile of orderedTargetProfiles) {
          await returnMitraToRoster(tx, profile.id);
        }
      }
      return request;
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
    }

    return NextResponse.json(osRequest);
  } catch (error) {
    console.error("OS Request POST error:", error);
    if (error instanceof MitraRosterDataIncompleteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
