import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

class CandidateQuotaReachedError extends Error {}
class VendorEmployeeUnavailableError extends Error {}
class CandidateRequiredFieldsMissingError extends Error {}

interface CandidatePayload {
  name: string;
  nik: string;
  fotoKtp: string;
  jenisSim: string;
  noSim: string;
  fotoSim: string;
  skck: string;
  phone: string;
  email: string;
  alamat: string;
  kelurahan: string;
  kecamatan: string;
  kabKota: string;
  provinsi: string;
  domisiliSesuaiKtp: boolean;
  domisiliAlamat: string;
  domisiliKelurahan: string;
  domisiliKecamatan: string;
  domisiliKabKota: string;
  domisiliProvinsi: string;
  discType: string;
  discReport: string;
  vendorEmployeeId: string | null;
  replacementMitraProfileId?: string | null;
}

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

function isValidSkck(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+=*)$/);
  if (!match) return false;
  const size = Buffer.from(match[2], "base64").length;
  return size > 0 && size <= maxImageBytes;
}

function isCandidatePayload(candidate: Record<string, unknown>): candidate is Record<string, unknown> & CandidatePayload {
  return [
    "name", "nik", "fotoKtp", "jenisSim", "noSim", "fotoSim", "skck", "phone", "email",
    "alamat", "kelurahan", "kecamatan", "kabKota", "provinsi",
    "domisiliAlamat", "domisiliKelurahan", "domisiliKecamatan", "domisiliKabKota",
    "domisiliProvinsi", "discType", "discReport",
  ].every((field) => typeof candidate[field] === "string")
    && typeof candidate.domisiliSesuaiKtp === "boolean"
    && (candidate.vendorEmployeeId === null || typeof candidate.vendorEmployeeId === "string");
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR" || !session.user.vendorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const vendorId = session.user.vendorId;

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
    if (candidates.some((candidate) => !candidate || typeof candidate !== "object" || Array.isArray(candidate))) {
      return NextResponse.json({ error: "Format data kandidat tidak valid." }, { status: 400 });
    }
    const candidateEntries = candidates as Record<string, unknown>[];

    const osRequest = await prisma.oSRequest.findFirst({
      where: {
        id: osRequestId,
        vendorId,
        status: "VENDOR_SELECTED",
      },
      select: { id: true, jumlah: true, type: true, mitraTargets: true },
    });

    if (!osRequest) {
      return NextResponse.json({ error: "Request tidak ditemukan atau tidak dapat menerima kandidat." }, { status: 404 });
    }
    const replacementTargetIds = Array.isArray(osRequest.mitraTargets)
      ? osRequest.mitraTargets.filter((id): id is string => typeof id === "string")
      : [];
    if (osRequest.type === "PERGANTIAN" && (
      candidateEntries.length !== osRequest.jumlah
      || replacementTargetIds.length !== osRequest.jumlah
    )) {
      return NextResponse.json({
        error: "Untuk pergantian, jumlah kandidat harus sama dengan jumlah Mitra OS yang dipilih.",
      }, { status: 400 });
    }

    const employeeIds = candidateEntries.flatMap((candidate) =>
      isNonEmptyString(candidate.employeeId) ? [candidate.employeeId] : [],
    );
    if (new Set(employeeIds).size !== employeeIds.length) {
      return NextResponse.json({ error: "Data karyawan yang sama tidak boleh dipilih lebih dari sekali." }, { status: 400 });
    }

    const employees = employeeIds.length > 0
      ? await prisma.vendorEmployee.findMany({
          where: {
            id: { in: employeeIds },
            vendorId,
            status: "ACTIVE",
            candidates: { none: { status: { in: ["KANDIDAT", "TERPILIH"] } } },
          },
        })
      : [];
    if (employees.length !== employeeIds.length) {
      return NextResponse.json({ error: "Salah satu data karyawan tidak tersedia atau sudah diajukan." }, { status: 409 });
    }
    const employeesById = new Map(employees.map((employee) => [employee.id, employee]));
    const submittedCandidates = candidateEntries.map((candidate, index) => {
      const replacementMitraProfileId = osRequest.type === "PERGANTIAN"
        ? replacementTargetIds[index]
        : null;
      if (!isNonEmptyString(candidate.employeeId)) {
        return { ...candidate, vendorEmployeeId: null, replacementMitraProfileId };
      }
      const employee = employeesById.get(candidate.employeeId);
      if (!employee) return { ...candidate, replacementMitraProfileId };
      return {
        name: employee.name,
        nik: employee.nik,
        fotoKtp: employee.fotoKtp,
        jenisSim: employee.jenisSim,
        noSim: employee.noSim,
        fotoSim: employee.fotoSim,
        skck: employee.skck,
        phone: employee.phone,
        email: employee.email,
        alamat: employee.alamat,
        kelurahan: employee.kelurahan,
        kecamatan: employee.kecamatan,
        kabKota: employee.kabKota,
        provinsi: employee.provinsi,
        domisiliSesuaiKtp: employee.domisiliSesuaiKtp,
        domisiliAlamat: employee.domisiliAlamat || "",
        domisiliKelurahan: employee.domisiliKelurahan || "",
        domisiliKecamatan: employee.domisiliKecamatan || "",
        domisiliKabKota: employee.domisiliKabKota || "",
        domisiliProvinsi: employee.domisiliProvinsi || "",
        discType: candidate.discType,
        discReport: candidate.discReport,
        vendorEmployeeId: employee.id,
        replacementMitraProfileId,
      };
    });

    const existingCandidates = await prisma.candidate.count({ where: { osRequestId } });
    if (existingCandidates > 0) {
      return NextResponse.json({ error: "Data kandidat untuk request ini sudah pernah dikirim." }, { status: 409 });
    }

    for (const candidate of submittedCandidates) {
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
      if (typeof candidate.jenisSim !== "string" || !["A", "B1", "B2", "C", "D"].includes(candidate.jenisSim)) {
        return NextResponse.json({ error: "Pilih jenis SIM yang tersedia." }, { status: 400 });
      }
      if (typeof candidate.noSim !== "string" || !/^\d+$/.test(candidate.noSim.trim())) {
        return NextResponse.json({ error: "No. SIM hanya boleh berisi angka." }, { status: 400 });
      }
      if (!isValidImage(candidate.fotoSim)) {
        return NextResponse.json({ error: "Foto SIM wajib berupa JPG/PNG dan maksimal 5 MB." }, { status: 400 });
      }
      if (!isValidSkck(candidate.skck)) {
        return NextResponse.json({ error: "SKCK wajib berupa PDF/JPG/PNG maksimal 5 MB." }, { status: 400 });
      }
      if (typeof candidate.discType !== "string" || !["D", "I", "S", "C"].includes(candidate.discType)) {
        return NextResponse.json({ error: "Pilih hasil utama DISC kandidat." }, { status: 400 });
      }
      if (!isValidSkck(candidate.discReport)) {
        return NextResponse.json({ error: "Laporan DISC wajib berupa PDF/JPG/PNG maksimal 5 MB." }, { status: 400 });
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
      if (candidate.domisiliSesuaiKtp !== true && candidate.domisiliSesuaiKtp !== false) {
        return NextResponse.json({ error: "Pilih apakah alamat domisili sama dengan alamat KTP." }, { status: 400 });
      }
      if (!candidate.domisiliSesuaiKtp && ![
        candidate.domisiliAlamat,
        candidate.domisiliKelurahan,
        candidate.domisiliKecamatan,
        candidate.domisiliKabKota,
        candidate.domisiliProvinsi,
      ].every(isNonEmptyString)) {
        return NextResponse.json({ error: "Alamat domisili yang berbeda dengan KTP wajib dilengkapi." }, { status: 400 });
      }
    }

    const normalizedCandidates: CandidatePayload[] = [];
    for (const candidate of submittedCandidates) {
      if (!isCandidatePayload(candidate)) {
        return NextResponse.json({ error: "Format data kandidat tidak valid." }, { status: 400 });
      }
      normalizedCandidates.push({
        ...candidate,
        name: candidate.name.trim(),
        nik: candidate.nik.trim(),
        jenisSim: candidate.jenisSim.trim(),
        noSim: candidate.noSim.trim(),
        phone: candidate.phone.trim(),
        email: candidate.email.trim().toLowerCase(),
        alamat: candidate.alamat.trim(),
        kelurahan: candidate.kelurahan.trim(),
        kecamatan: candidate.kecamatan.trim(),
        kabKota: candidate.kabKota.trim(),
        provinsi: candidate.provinsi.trim(),
        domisiliSesuaiKtp: candidate.domisiliSesuaiKtp,
        domisiliAlamat: candidate.domisiliSesuaiKtp ? "" : candidate.domisiliAlamat.trim(),
        domisiliKelurahan: candidate.domisiliSesuaiKtp ? "" : candidate.domisiliKelurahan.trim(),
        domisiliKecamatan: candidate.domisiliSesuaiKtp ? "" : candidate.domisiliKecamatan.trim(),
        domisiliKabKota: candidate.domisiliSesuaiKtp ? "" : candidate.domisiliKabKota.trim(),
        domisiliProvinsi: candidate.domisiliSesuaiKtp ? "" : candidate.domisiliProvinsi.trim(),
        discType: candidate.discType.trim(),
        discReport: candidate.discReport,
      });
    }

    const emails = normalizedCandidates.map((candidate) => candidate.email);
    if (new Set(emails).size !== emails.length) {
      return NextResponse.json({ error: "Email setiap kandidat harus berbeda." }, { status: 400 });
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        email: { in: emails },
        OR: [
          { status: "ACTIVE" },
          { role: { not: "MITRA" } },
          {
            mitraProfile: {
              status: { in: ["ACTIVE", "PENDING"] },
            },
          },
        ],
      },
      select: { email: true },
    });
    const existingRequests = await prisma.accountRequest.findMany({
      where: {
        email: { in: emails },
        status: { in: ["WAITING_SELECTION", "PENDING"] },
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

    const totalPhotoBytes = normalizedCandidates.reduce((total, candidate) => (
      total +
      Buffer.from(candidate.fotoKtp.split(",")[1], "base64").length +
      Buffer.from(candidate.fotoSim.split(",")[1], "base64").length
      + Buffer.from(candidate.skck.split(",")[1], "base64").length
      + Buffer.from(candidate.discReport.split(",")[1], "base64").length
    ), 0);
    if (totalPhotoBytes > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Total ukuran foto per pengiriman maksimal 15 MB." }, { status: 400 });
    }

    const submitted = await prisma.$transaction(async (tx) => {
      const reservedRequest = await tx.oSRequest.updateMany({
        where: {
          id: osRequestId,
          vendorId,
          status: "VENDOR_SELECTED",
        },
        data: { status: "WAITING_SELECTION" },
      });
      if (reservedRequest.count !== 1) return false;

      for (let index = 0; index < normalizedCandidates.length; index += 1) {
        const candidate = normalizedCandidates[index];
        if (candidate.vendorEmployeeId) {
          const reservedEmployee = await tx.vendorEmployee.updateMany({
            where: {
              id: candidate.vendorEmployeeId,
              vendorId,
              status: "ACTIVE",
            },
            data: { status: "IN_SELECTION" },
          });
          if (reservedEmployee.count !== 1) throw new VendorEmployeeUnavailableError();
        }
        const accountRequest = await tx.accountRequest.create({
          data: {
            type: "MITRA",
            name: candidate.name,
            email: emails[index],
            phone: candidate.phone,
            vendorId,
            requesterId: session.user.id,
            status: "WAITING_SELECTION",
          },
        });

        await tx.candidate.create({
          data: {
            osRequestId,
            accountRequestId: accountRequest.id,
            name: candidate.name,
            nik: candidate.nik,
            fotoKtp: candidate.fotoKtp,
            jenisSim: candidate.jenisSim,
            noSim: candidate.noSim,
            fotoSim: candidate.fotoSim,
            skck: candidate.skck,
            phone: candidate.phone,
            email: emails[index],
            alamat: candidate.alamat,
            kelurahan: candidate.kelurahan,
            kecamatan: candidate.kecamatan,
            kabKota: candidate.kabKota,
            provinsi: candidate.provinsi,
            domisiliSesuaiKtp: candidate.domisiliSesuaiKtp,
            domisiliAlamat: candidate.domisiliAlamat || null,
            domisiliKelurahan: candidate.domisiliKelurahan || null,
            domisiliKecamatan: candidate.domisiliKecamatan || null,
            domisiliKabKota: candidate.domisiliKabKota || null,
            domisiliProvinsi: candidate.domisiliProvinsi || null,
            discType: candidate.discType,
            discReport: candidate.discReport,
            vendorEmployeeId: candidate.vendorEmployeeId,
            replacementMitraProfileId: candidate.replacementMitraProfileId || null,
          },
        });
      }

      return true;
    });

    if (!submitted) {
      return NextResponse.json({ error: "Request ini sudah menerima data kandidat." }, { status: 409 });
    }

    return NextResponse.json({ count: normalizedCandidates.length });
  } catch (error) {
    console.error("Candidate POST error:", error);
    if (error instanceof VendorEmployeeUnavailableError) {
      return NextResponse.json({ error: "Data karyawan sudah dipakai untuk pengajuan lain." }, { status: 409 });
    }
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
    if (!isNonEmptyString(body.alasanKeputusan)) {
      return NextResponse.json({ error: "Alasan keputusan wajib diisi." }, { status: 400 });
    }
    if (body.alasanKeputusan.trim().length > 2000) {
      return NextResponse.json({ error: "Alasan keputusan maksimal 2.000 karakter." }, { status: 400 });
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
          vendorEmployeeId: true,
          name: true,
          nik: true,
          fotoKtp: true,
          jenisSim: true,
          noSim: true,
          fotoSim: true,
          skck: true,
          phone: true,
          email: true,
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
          discType: true,
          discReport: true,
          osRequest: { select: { jumlah: true } },
        },
      });
      if (!candidate) return null;

      if (decision === "APPROVED") {
        const requiredCandidateFields: [string, string | null][] = [
          ["Nama Mitra", candidate.name],
          ["NIK", candidate.nik],
          ["Foto KTP", candidate.fotoKtp],
          ["Jenis SIM", candidate.jenisSim],
          ["Nomor SIM", candidate.noSim],
          ["Foto SIM", candidate.fotoSim],
          ["SKCK", candidate.skck],
          ["No. HP", candidate.phone],
          ["Email", candidate.email],
          ["Alamat", candidate.alamat],
          ["Kelurahan/Desa", candidate.kelurahan],
          ["Kecamatan", candidate.kecamatan],
          ["Kabupaten/Kota", candidate.kabKota],
          ["Provinsi", candidate.provinsi],
        ];
        const missingFields = requiredCandidateFields
          .filter(([, value]) => !value?.trim())
          .map(([label]) => label);
        if (missingFields.length > 0) {
          throw new CandidateRequiredFieldsMissingError(
            `Data wajib kandidat belum lengkap: ${missingFields.join(", ")}. Data lain yang opsional tidak perlu dilengkapi.`,
          );
        }

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
        data: {
          status: decision === "APPROVED" ? "TERPILIH" : "DITOLAK",
          alasanKeputusan: body.alasanKeputusan.trim(),
          ...(decision === "APPROVED" ? { acceptedAt: new Date() } : {}),
        },
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
            select: { id: true, accountRequestId: true, vendorEmployeeId: true },
          });
          autoRejectedCount = (await tx.candidate.updateMany({
            where: {
              osRequestId: candidate.osRequestId,
              status: "KANDIDAT",
            },
            data: { status: "DITOLAK", alasanKeputusan: "Kuota kandidat diterima telah terpenuhi." },
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
          const rejectedEmployeeIds = remainingCandidates
            .map((remainingCandidate) => remainingCandidate.vendorEmployeeId)
            .filter((id): id is string => id !== null);
          if (rejectedEmployeeIds.length > 0) {
            await tx.vendorEmployee.updateMany({
              where: { id: { in: rejectedEmployeeIds }, status: "IN_SELECTION" },
              data: { status: "ACTIVE" },
            });
          }
        }
      }

      if (decision === "REJECTED" && candidate.vendorEmployeeId) {
        await tx.vendorEmployee.updateMany({
          where: { id: candidate.vendorEmployeeId, status: "IN_SELECTION" },
          data: { status: "ACTIVE" },
        });
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
    if (error instanceof CandidateRequiredFieldsMissingError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Seleksi kandidat sedang diproses bersamaan. Silakan coba kembali." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
