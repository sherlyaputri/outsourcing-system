import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { encryptInitialPassword, generateInitialPassword } from "@/lib/initial-password";
import { MitraRosterDataIncompleteError, returnMitraToRoster } from "@/lib/mitra-roster";

class CandidateQuotaReachedError extends Error {}

async function generateMitraOsId(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const idMitraOs = `WAXD${randomInt(1_000, 10_000)}`;
    const existing = await tx.mitraProfile.findFirst({
      where: { idMitraOs },
      select: { id: true },
    });
    if (!existing) return idMitraOs;
  }
  throw new Error("Unable to generate a unique Mitra OS ID");
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["VM", "VENDOR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: Prisma.AccountRequestWhereInput = {
      status: "PENDING",
      OR: [
        { candidate: null },
        {
          candidate: {
            is: {
              status: "TERPILIH",
              osRequest: { is: { status: "WAITING_ACTIVATION" } },
            },
          },
        },
      ],
    };
    const candidateSelect = session.user.role === "VM"
      ? {
          id: true,
          nik: true,
          fotoKtp: true,
          jenisSim: true,
          noSim: true,
          fotoSim: true,
          skck: true,
          skbn: true,
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
          alasanKeputusan: true,
          osRequest: { select: { id: true, type: true, jumlah: true, posisi: true, penempatan: true, waktuKerja: true } },
        }
      : { id: true, osRequest: { select: { id: true, type: true, jumlah: true } } };
    if (session.user.role === "VENDOR") {
      where = {
        requesterId: session.user.id,
        OR: [
          { status: { in: ["WAITING_SELECTION", "PENDING", "REJECTED"] } },
          { status: "ACTIVATED" },
        ],
      };
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

    const vendorIds = [...new Set(requests.map((request) => request.vendorId).filter((id): id is string => Boolean(id)))];
    const vendorEmails = [...new Set(requests.filter((request) => request.type === "VENDOR").map((request) => request.email))];
    const vendorLookup = [
      ...(vendorIds.length ? [{ id: { in: vendorIds } }] : []),
      ...(vendorEmails.length ? [{ email: { in: vendorEmails } }] : []),
    ];
    const vendors = vendorLookup.length
      ? await prisma.vendor.findMany({ where: { OR: vendorLookup }, select: { id: true, name: true, email: true } })
      : [];
    const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
    const vendorNameByEmail = new Map(vendors.filter((vendor) => vendor.email).map((vendor) => [vendor.email!, vendor.name]));

    const response = requests.map((request) => {
      const requestWithVendor = {
        ...request,
        vendorName: (request.vendorId ? vendorNameById.get(request.vendorId) : null)
          || (request.type === "VENDOR" ? vendorNameByEmail.get(request.email) : null)
          || null,
      };
      if (request.candidate && "skbn" in request.candidate) {
        const { skbn, ...candidateSummary } = request.candidate;
        return {
          ...requestWithVendor,
          candidate: {
            ...candidateSummary,
            hasSkbn: Boolean(skbn),
            skbnIsImage: Boolean(skbn && /^data:image\//.test(skbn)),
          },
        };
      }
      return requestWithVendor;
    });

    return NextResponse.json(response);
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
    const { action, osRequestId } = body;
    if (action !== "REQUEST_CANDIDATE_ACCOUNTS" || typeof osRequestId !== "string" || !session.user.vendorId) {
      return NextResponse.json({ error: "Request akun harus berasal dari kandidat pada Request OS." }, { status: 400 });
    }

    const requestedCount = await prisma.$transaction(async (tx) => {
      const osRequest = await tx.oSRequest.findFirst({
        where: {
          id: osRequestId,
          vendorId: session.user.vendorId,
          status: "WAITING_VENDOR_REQUEST",
        },
        select: { id: true },
      });
      if (!osRequest) return 0;

      const selectedCandidates = await tx.candidate.findMany({
        where: { osRequestId, status: "TERPILIH" },
        select: { skbn: true },
      });
      if (selectedCandidates.some((candidate) => !candidate.skbn)) return -1;

      const requested = await tx.accountRequest.updateMany({
        where: {
          requesterId: session.user.id,
          status: "WAITING_SELECTION",
          candidate: { is: { osRequestId, status: "TERPILIH" } },
        },
        data: { status: "PENDING" },
      });
      if (requested.count > 0) {
        await tx.oSRequest.update({
          where: { id: osRequestId },
          data: { status: "WAITING_ACTIVATION" },
        });
      }
      return requested.count;
    });

    if (requestedCount === -1) {
      return NextResponse.json({ error: "SKBN wajib diunggah untuk semua Mitra yang diterima sebelum request akun." }, { status: 409 });
    }
    if (requestedCount === 0) {
      return NextResponse.json({ error: "Belum ada kandidat yang lolos seleksi dan siap diajukan." }, { status: 409 });
    }
    return NextResponse.json({ count: requestedCount });
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
          include: {
            osRequest: true,
            replacementMitraProfile: true,
          },
        },
      },
    });

    if (!accountReq) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    if (accountReq.status !== "PENDING") {
      return NextResponse.json({ error: "Pengajuan ini sudah diproses" }, { status: 409 });
    }
    if (accountReq.candidate && accountReq.candidate.status !== "TERPILIH") {
      return NextResponse.json({ error: "Kandidat belum lolos seleksi SM." }, { status: 409 });
    }
    if (accountReq.candidate && accountReq.candidate.osRequest.status !== "WAITING_ACTIVATION") {
      return NextResponse.json({ error: "Request OS ini sudah selesai diproses." }, { status: 409 });
    }

    if (status === "APPROVED") {
      if (accountReq.type === "VENDOR") {
        const vendor = accountReq.vendorId
          ? await prisma.vendor.findUnique({ where: { id: accountReq.vendorId } })
          : await prisma.vendor.findFirst({ where: { email: accountReq.email } });
        if (!vendor) return NextResponse.json({ error: "Data perusahaan vendor tidak ditemukan." }, { status: 404 });
        const existingUser = await prisma.user.findUnique({ where: { email: accountReq.email } });
        if (existingUser && (existingUser.role !== "VENDOR" || existingUser.status === "ACTIVE")) {
          return NextResponse.json({ error: "Email sudah digunakan oleh akun lain." }, { status: 409 });
        }

        const initialPassword = generateInitialPassword();
        const [hashedPassword] = await Promise.all([bcrypt.hash(initialPassword, 10)]);
        const encryptedInitialPassword = encryptInitialPassword(initialPassword);
        const result = await prisma.$transaction(async (tx) => {
          const user = existingUser
            ? await tx.user.update({
                where: { id: existingUser.id },
                data: { password: hashedPassword, initialPasswordEncrypted: encryptedInitialPassword, name: accountReq.name, role: "VENDOR", status: "ACTIVE", phone: accountReq.phone, vendorId: vendor.id },
              })
            : await tx.user.create({
                data: { email: accountReq.email, password: hashedPassword, initialPasswordEncrypted: encryptedInitialPassword, name: accountReq.name, role: "VENDOR", status: "ACTIVE", phone: accountReq.phone, vendorId: vendor.id },
              });
          await tx.vendor.update({ where: { id: vendor.id }, data: { status: "ACTIVE" } });
          const updatedRequest = await tx.accountRequest.update({
            where: { id: requestId },
            data: { status: "ACTIVATED", vendorId: vendor.id, catatan, handlerId: session.user.id },
          });
          return { ...updatedRequest, initialPassword, userId: user.id };
        });
        return NextResponse.json(result);
      }

      const initialPassword = generateInitialPassword();
      const hashedPassword = await bcrypt.hash(initialPassword, 10);
      const encryptedInitialPassword = encryptInitialPassword(initialPassword);
      const userWithEmail = await prisma.user.findUnique({
        where: { email: accountReq.email },
        include: { mitraProfile: true },
      });
      if (userWithEmail) {
        if (
          userWithEmail.role !== "MITRA" ||
          userWithEmail.status === "ACTIVE" ||
          (userWithEmail.mitraProfile && ["ACTIVE", "PENDING"].includes(userWithEmail.mitraProfile.status))
        ) {
          return NextResponse.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 409 });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        if (accountReq.candidate) {
          const activatedCount = await tx.candidate.count({
            where: {
              osRequestId: accountReq.candidate.osRequestId,
              status: "ACTIVATED",
            },
          });
          if (activatedCount >= accountReq.candidate.osRequest.jumlah) {
            throw new CandidateQuotaReachedError();
          }
        }
        const documentDeadlineAt = accountReq.candidate
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : null;

        const user = userWithEmail
          ? await tx.user.update({
              where: { id: userWithEmail.id },
              data: {
                password: hashedPassword,
                initialPasswordEncrypted: encryptedInitialPassword,
                name: accountReq.name,
                role: "MITRA",
                status: "ACTIVE",
                phone: accountReq.phone,
                vendorId: accountReq.vendorId,
              },
            })
          : await tx.user.create({
              data: {
                email: accountReq.email,
                password: hashedPassword,
                initialPasswordEncrypted: encryptedInitialPassword,
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

          const existingProfile = await tx.mitraProfile.findUnique({
            where: { userId: user.id },
          });

          const profileData = {
            vendorId: accountReq.candidate.replacementMitraProfile?.vendorId || accountReq.vendorId,
            idMitraOs: existingProfile?.idMitraOs || (await generateMitraOsId(tx)),
            status: "ACTIVE",
            endDate: null,
            nik: accountReq.candidate.nik,
            waktuKerja: accountReq.candidate.replacementMitraProfile?.waktuKerja
              || accountReq.candidate.osRequest.waktuKerja,
            fotoKtp: accountReq.candidate.fotoKtp,
            jenisSim: accountReq.candidate.jenisSim,
            noSim: accountReq.candidate.noSim,
            fotoSim: accountReq.candidate.fotoSim,
            skck: accountReq.candidate.skck,
            alamat: accountReq.candidate.alamat,
            kelurahan: accountReq.candidate.kelurahan,
            kecamatan: accountReq.candidate.kecamatan,
            kabKota: accountReq.candidate.kabKota,
            provinsi: accountReq.candidate.provinsi,
            domisiliSesuaiKtp: accountReq.candidate.domisiliSesuaiKtp,
            domisiliAlamat: accountReq.candidate.domisiliAlamat,
            domisiliKelurahan: accountReq.candidate.domisiliKelurahan,
            domisiliKecamatan: accountReq.candidate.domisiliKecamatan,
            domisiliKabKota: accountReq.candidate.domisiliKabKota,
            domisiliProvinsi: accountReq.candidate.domisiliProvinsi,
            dokumenDeadlineAt: documentDeadlineAt,
            posisi: accountReq.candidate.replacementMitraProfile?.posisi
              || accountReq.candidate.osRequest.posisi,
            penempatan: accountReq.candidate.replacementMitraProfile?.penempatan
              || accountReq.candidate.osRequest.penempatan,
          };

          const mitraProfile = existingProfile
            ? await tx.mitraProfile.update({
                where: { id: existingProfile.id },
                data: profileData,
              })
            : await tx.mitraProfile.create({
                data: {
                  userId: user.id,
                  ...profileData,
                },
              });
          if (accountReq.candidate.skbn) {
            const skbnMatch = accountReq.candidate.skbn.match(
              /^data:(application\/pdf|image\/jpeg|image\/png);base64,[A-Za-z0-9+/]+={0,2}$/,
            );
            if (!skbnMatch) {
              throw new Error("Candidate SKBN document has an invalid format");
            }
            await tx.mitraDocument.deleteMany({
              where: { mitraProfileId: mitraProfile.id, name: "SKBN" },
            });
            await tx.mitraDocument.create({
              data: {
                mitraProfileId: mitraProfile.id,
                name: "SKBN",
                mimeType: skbnMatch[1],
                content: accountReq.candidate.skbn,
              },
            });
          }
          await tx.candidate.update({
            where: { id: accountReq.candidate.id },
            data: { status: "ACTIVATED", documentDeadlineAt },
          });
          if (accountReq.candidate.vendorEmployeeId) {
            await tx.vendorEmployee.update({
              where: { id: accountReq.candidate.vendorEmployeeId },
              data: { status: "HIRED" },
            });
          }
          if (accountReq.candidate.replacementMitraProfileId) {
            await returnMitraToRoster(tx, accountReq.candidate.replacementMitraProfileId);
          }

          const updatedRequest = await tx.accountRequest.update({
            where: { id: requestId },
            data: {
              status: "ACTIVATED",
              catatan,
              handlerId: session.user.id,
            },
          });
          const pendingCount = await tx.accountRequest.count({
            where: {
              status: "PENDING",
              candidate: { is: { osRequestId: accountReq.candidate.osRequestId } },
            },
          });
          const activatedCount = await tx.candidate.count({
            where: { osRequestId: accountReq.candidate.osRequestId, status: "ACTIVATED" },
          });
          if (activatedCount >= accountReq.candidate.osRequest.jumlah) {
            await tx.oSRequest.update({
              where: { id: accountReq.candidate.osRequestId },
              data: { status: "COMPLETED" },
            });
          } else if (pendingCount === 0) {
            await tx.oSRequest.update({
              where: { id: accountReq.candidate.osRequestId },
              data: { status: activatedCount > 0 ? "COMPLETED" : "NOT_SELECTED" },
            });
          }
          return updatedRequest;
        }

        return tx.accountRequest.update({
          where: { id: requestId },
          data: {
            status: "ACTIVATED",
            catatan,
            handlerId: session.user.id,
          },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return NextResponse.json(result);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (accountReq.candidate) {
        await tx.candidate.update({
          where: { id: accountReq.candidate.id },
          data: { status: "DITOLAK" },
        });
        if (accountReq.candidate.vendorEmployeeId) {
          await tx.vendorEmployee.update({
            where: { id: accountReq.candidate.vendorEmployeeId },
            data: { status: "ACTIVE" },
          });
        }
      }
      const updatedRequest = await tx.accountRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          catatan,
          handlerId: session.user.id,
        },
      });
      if (accountReq.candidate) {
        const pendingCount = await tx.accountRequest.count({
          where: {
            status: "PENDING",
            candidate: { is: { osRequestId: accountReq.candidate.osRequestId } },
          },
        });
        if (pendingCount === 0) {
          const activatedCount = await tx.candidate.count({
            where: { osRequestId: accountReq.candidate.osRequestId, status: "ACTIVATED" },
          });
          await tx.oSRequest.update({
            where: { id: accountReq.candidate.osRequestId },
            data: { status: activatedCount > 0 ? "COMPLETED" : "NOT_SELECTED" },
          });
        }
      }
      return updatedRequest;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Account Request PATCH error:", error);
    if (error instanceof MitraRosterDataIncompleteError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof CandidateQuotaReachedError) {
      return NextResponse.json({ error: "Jumlah kandidat yang diaktifkan sudah memenuhi kuota Request OS." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Request OS sedang diproses bersamaan. Silakan coba kembali." }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
