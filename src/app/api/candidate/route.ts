import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

class CandidateQuotaReachedError extends Error {}

const maxImageBytes = 5 * 1024 * 1024;
const maxCandidatesPerSubmission = 10;
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/]+=*)$/);
  return Boolean(match && Buffer.from(match[1], "base64").length <= maxImageBytes);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { osRequestId, candidates } = body;

    if (
      !isNonEmptyString(osRequestId) ||
      !Array.isArray(candidates) ||
      candidates.length < 1 ||
      candidates.length > maxCandidatesPerSubmission
    ) {
      return NextResponse.json({ error: "Data kandidat tidak valid (1-10 kandidat per pengiriman)." }, { status: 400 });
    }

    const osRequest = await prisma.oSRequest.findFirst({
      where: {
        id: osRequestId,
        vendorId: session.user.vendorId,
        status: "VENDOR_SELECTED",
      },
      select: { id: true, jumlah: true },
    });

    if (!osRequest) {
      return NextResponse.json({ error: "Request tidak ditemukan atau tidak dapat menerima kandidat." }, { status: 404 });
    }
    const existingCandidates = await prisma.candidate.count({ where: { osRequestId } });
    if (existingCandidates > 0) {
      return NextResponse.json({ error: "Data kandidat untuk request ini sudah pernah dikirim." }, { status: 409 });
    }

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== "object") {
        return NextResponse.json({ error: "Format data kandidat tidak valid." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.name)) {
        return NextResponse.json({ error: "Nama Mitra wajib diisi." }, { status: 400 });
      }
      if (typeof candidate.nik !== "string" || !/^\d{16}$/.test(candidate.nik.trim())) {
        return NextResponse.json({ error: "NIK KTP harus tepat 16 digit angka." }, { status: 400 });
      }
      if (!isValidImage(candidate.fotoKtp)) {
        return NextResponse.json({ error: "Foto KTP wajib berupa JPG/PNG dan maksimal 5 MB." }, { status: 400 });
      }
      if (!["A", "B1", "B2", "C", "D"].includes(candidate.jenisSim)) {
        return NextResponse.json({ error: "Pilih jenis SIM yang tersedia." }, { status: 400 });
      }
      if (typeof candidate.noSim !== "string" || !/^\d+$/.test(candidate.noSim.trim())) {
        return NextResponse.json({ error: "No. SIM hanya boleh berisi angka." }, { status: 400 });
      }
      if (!isValidImage(candidate.fotoSim)) {
        return NextResponse.json({ error: "Foto SIM wajib berupa JPG/PNG dan maksimal 5 MB." }, { status: 400 });
      }
      if (typeof candidate.phone !== "string" || !/^08\d{8,12}$/.test(candidate.phone.trim())) {
        return NextResponse.json({ error: "No. HP hanya boleh angka dan harus berformat 08xxxxxxxxxxxx." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email.trim())) {
        return NextResponse.json({ error: "Email harus berformat nama@domain.com." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.alamat)) {
        return NextResponse.json({ error: "Alamat tempat tinggal wajib diisi." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.kelurahan)) {
        return NextResponse.json({ error: "Kelurahan/Desa wajib dipilih." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.kecamatan)) {
        return NextResponse.json({ error: "Kecamatan wajib dipilih." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.kabKota)) {
        return NextResponse.json({ error: "Kabupaten/Kota wajib dipilih." }, { status: 400 });
      }
      if (!isNonEmptyString(candidate.provinsi)) {
        return NextResponse.json({ error: "Provinsi wajib dipilih." }, { status: 400 });
      }
    }

    const emails = candidates.map((candidate: { email: string }) => candidate.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) {
      return NextResponse.json({ error: "Email setiap kandidat harus berbeda." }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    const existingRequests = await prisma.accountRequest.findMany({
      where: {
        email: { in: emails },
        status: { in: ["WAITING_SELECTION", "PENDING", "APPROVED", "ACTIVATED"] },
      },
      select: { email: true },
    });
    const alreadyUsedEmails = new Set([
      ...existingUsers.map((user) => user.email.toLowerCase()),
      ...existingRequests.map((request) => request.email.toLowerCase()),
    ]);

    if (emails.some((email) => alreadyUsedEmails.has(email))) {
      return NextResponse.json({ error: "Email kandidat sudah terdaftar atau sedang diajukan." }, { status: 409 });
    }

    const totalPhotoBytes = candidates.reduce((total: number, candidate: { fotoKtp: string; fotoSim: string }) => (
      total +
      Buffer.from(candidate.fotoKtp.split(",")[1], "base64").length +
      Buffer.from(candidate.fotoSim.split(",")[1], "base64").length
    ), 0);
    if (totalPhotoBytes > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Total ukuran foto per pengiriman maksimal 15 MB." }, { status: 400 });
    }

    const submitted = await prisma.$transaction(async (tx) => {
      const reservedRequest = await tx.oSRequest.updateMany({
        where: {
          id: osRequestId,
          vendorId: session.user.vendorId,
          status: "VENDOR_SELECTED",
        },
        data: { status: "WAITING_SELECTION" },
      });
      if (reservedRequest.count !== 1) return false;

      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const accountRequest = await tx.accountRequest.create({
          data: {
            type: "MITRA",
            name: candidate.name.trim(),
            email: emails[index],
            phone: candidate.phone.trim(),
            vendorId: session.user.vendorId,
            requesterId: session.user.id,
            status: "WAITING_SELECTION",
          },
        });

        await tx.candidate.create({
          data: {
            osRequestId,
            accountRequestId: accountRequest.id,
            name: candidate.name.trim(),
            nik: candidate.nik.trim(),
            fotoKtp: candidate.fotoKtp,
            jenisSim: candidate.jenisSim.trim(),
            noSim: candidate.noSim.trim(),
            fotoSim: candidate.fotoSim,
            phone: candidate.phone.trim(),
            email: emails[index],
            alamat: candidate.alamat.trim(),
            kelurahan: candidate.kelurahan.trim(),
            kecamatan: candidate.kecamatan.trim(),
            kabKota: candidate.kabKota.trim(),
            provinsi: candidate.provinsi.trim(),
          },
        });
      }

      return true;
    });

    if (!submitted) {
      return NextResponse.json({ error: "Request ini sudah menerima data kandidat." }, { status: 409 });
    }

    return NextResponse.json({ count: candidates.length });
  } catch (error) {
    console.error("Candidate POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { candidateId, decision } = body;
    if (!isNonEmptyString(candidateId) || !["APPROVED", "REJECTED"].includes(decision)) {
      return NextResponse.json({ error: "Keputusan kandidat tidak valid." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const candidate = await tx.candidate.findFirst({
        where: {
          id: candidateId,
          osRequest: { requesterId: session.user.id, status: { in: ["WAITING_SELECTION", "IN_PROGRESS"] } },
          status: "KANDIDAT",
        },
        select: {
          id: true,
          osRequestId: true,
          accountRequestId: true,
          osRequest: { select: { jumlah: true } },
        },
      });
      if (!candidate) return null;

      if (decision === "APPROVED") {
        const acceptedCount = await tx.candidate.count({
          where: {
            osRequestId: candidate.osRequestId,
            status: { in: ["TERPILIH", "ACTIVATED"] },
          },
        });
        if (acceptedCount >= candidate.osRequest.jumlah) {
          throw new CandidateQuotaReachedError();
        }
      }

      const updatedCandidate = await tx.candidate.updateMany({
        where: { id: candidate.id, status: "KANDIDAT" },
        data: { status: decision === "APPROVED" ? "TERPILIH" : "DITOLAK" },
      });
      if (updatedCandidate.count !== 1) return null;

      if (candidate.accountRequestId) {
        await tx.accountRequest.update({
          where: { id: candidate.accountRequestId },
          data: { status: decision === "APPROVED" ? "WAITING_SELECTION" : "REJECTED" },
        });
      }

      let autoRejectedCount = 0;
      if (decision === "APPROVED") {
        const acceptedCount = await tx.candidate.count({
          where: {
            osRequestId: candidate.osRequestId,
            status: { in: ["TERPILIH", "ACTIVATED"] },
          },
        });
        if (acceptedCount >= candidate.osRequest.jumlah) {
          const remainingCandidates = await tx.candidate.findMany({
            where: { osRequestId: candidate.osRequestId, status: "KANDIDAT" },
            select: { id: true, accountRequestId: true },
          });
          autoRejectedCount = (await tx.candidate.updateMany({
            where: {
              osRequestId: candidate.osRequestId,
              status: "KANDIDAT",
            },
            data: { status: "DITOLAK" },
          })).count;
          const accountRequestIds = remainingCandidates
            .map((remainingCandidate) => remainingCandidate.accountRequestId)
            .filter((id): id is string => id !== null);
          if (accountRequestIds.length > 0) {
            await tx.accountRequest.updateMany({
              where: { id: { in: accountRequestIds } },
              data: { status: "REJECTED" },
            });
          }
        }
      }

      const undecidedCount = await tx.candidate.count({
        where: { osRequestId: candidate.osRequestId, status: "KANDIDAT" },
      });
      if (undecidedCount === 0) {
        const selectedCount = await tx.candidate.count({
          where: { osRequestId: candidate.osRequestId, status: "TERPILIH" },
        });
        await tx.oSRequest.update({
          where: { id: candidate.osRequestId },
          data: { status: selectedCount > 0 ? "WAITING_VENDOR_REQUEST" : "NOT_SELECTED" },
        });
      } else {
        await tx.oSRequest.updateMany({
          where: { id: candidate.osRequestId, status: "IN_PROGRESS" },
          data: { status: "WAITING_SELECTION" },
        });
      }

      return {
        id: candidate.id,
        status: decision === "APPROVED" ? "TERPILIH" : "DITOLAK",
        autoRejectedCount,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!result) {
      return NextResponse.json({ error: "Kandidat tidak ditemukan atau sudah diproses." }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Candidate PATCH error:", error);
    if (error instanceof CandidateQuotaReachedError) {
      return NextResponse.json({ error: "Kuota kandidat diterima sudah terpenuhi sesuai jumlah Request OS." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Seleksi kandidat sedang diproses bersamaan. Silakan coba kembali." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
