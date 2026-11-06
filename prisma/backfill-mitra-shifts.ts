import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const defaultShift = "08:00-17:00";

function normalizeShift(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "");
  if (["08:00-17:00", "8:00-17:00", "pagi", "shiftpagi", "day"].includes(normalized)) {
    return "08:00-17:00";
  }
  if (["20:00-05:00", "malam", "shiftmalam", "night"].includes(normalized)) {
    return "20:00-05:00";
  }
  return null;
}

async function main() {
  const mitras = await prisma.user.findMany({
    where: { role: "MITRA" },
    select: {
      id: true,
      email: true,
      vendorId: true,
      mitraProfile: { select: { id: true, waktuKerja: true } },
    },
  });

  let createdProfiles = 0;
  let updatedSchedules = 0;
  let retainedSchedules = 0;
  let skippedWithoutVendor = 0;

  for (const mitra of mitras) {
    if (!mitra.vendorId) {
      skippedWithoutVendor += 1;
      continue;
    }

    const candidate = await prisma.candidate.findFirst({
      where: { email: mitra.email, status: "ACTIVATED" },
      orderBy: { updatedAt: "desc" },
      select: { osRequest: { select: { waktuKerja: true } } },
    });
    const requestedShift = normalizeShift(candidate?.osRequest.waktuKerja);
    const existingShift = normalizeShift(mitra.mitraProfile?.waktuKerja);
    const shift = requestedShift || existingShift || defaultShift;

    if (!mitra.mitraProfile) {
      await prisma.mitraProfile.create({
        data: {
          userId: mitra.id,
          vendorId: mitra.vendorId,
          waktuKerja: shift,
        },
      });
      createdProfiles += 1;
      continue;
    }

    if (mitra.mitraProfile.waktuKerja === shift) {
      retainedSchedules += 1;
      continue;
    }

    await prisma.mitraProfile.update({
      where: { id: mitra.mitraProfile.id },
      data: { waktuKerja: shift },
    });
    updatedSchedules += 1;
  }

  const scheduleDistribution = await prisma.mitraProfile.groupBy({
    by: ["waktuKerja"],
    _count: { _all: true },
  });

  console.log("Backfill jadwal shift mitra selesai.");
  console.log(`Total mitra diperiksa: ${mitras.length}`);
  console.log(`Profil yang dibuat: ${createdProfiles}`);
  console.log(`Jadwal yang diisi/dinormalisasi: ${updatedSchedules}`);
  console.log(`Jadwal yang sudah sesuai: ${retainedSchedules}`);
  console.log(`Mitra dilewati karena tidak memiliki vendor: ${skippedWithoutVendor}`);
  console.log(`Distribusi jadwal: ${JSON.stringify(scheduleDistribution)}`);
}

main()
  .catch((error) => {
    console.error("Backfill jadwal shift mitra gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
