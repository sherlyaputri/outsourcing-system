import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const mitras = await prisma.user.findMany({
    where: { role: "MITRA", vendorId: { not: null } },
    select: {
      id: true,
      email: true,
      vendorId: true,
      mitraProfile: { select: { id: true, nik: true, skck: true } },
    },
  });
  const vendorIds: string[] = [];
  for (const mitra of mitras) {
    if (mitra.vendorId && vendorIds.indexOf(mitra.vendorId) === -1) {
      vendorIds.push(mitra.vendorId);
    }
  }
  const employees = await prisma.vendorEmployee.findMany({
    where: { vendorId: { in: vendorIds } },
    select: { id: true, vendorId: true, email: true, nik: true, skck: true },
  });
  const candidates = await prisma.candidate.findMany({
    where: {
      status: "ACTIVATED",
      skck: { not: null },
      osRequest: { vendorId: { in: vendorIds } },
    },
    select: {
      email: true,
      nik: true,
      skck: true,
      osRequest: { select: { vendorId: true } },
    },
  });
  const employeesByVendor = new Map<string, typeof employees>();
  for (const employee of employees) {
    const vendorEmployees = employeesByVendor.get(employee.vendorId) || [];
    vendorEmployees.push(employee);
    employeesByVendor.set(employee.vendorId, vendorEmployees);
  }

  let copied = 0;
  let alreadyComplete = 0;
  let missingProfile = 0;
  let noMatch = 0;
  let noRosterSkck = 0;
  let ambiguousMatch = 0;

  for (const mitra of mitras) {
    if (!mitra.mitraProfile) {
      missingProfile += 1;
      continue;
    }
    if (mitra.mitraProfile.skck) {
      alreadyComplete += 1;
      continue;
    }

    const matchingEmployeeSkcks = (employeesByVendor.get(mitra.vendorId!) || []).filter((employee) => (
      employee.email.trim().toLowerCase() === mitra.email.trim().toLowerCase()
      || (mitra.mitraProfile?.nik && employee.nik === mitra.mitraProfile.nik)
    )).flatMap((employee) => employee.skck ? [employee.skck] : []);
    const matchingCandidateSkcks = candidates
      .filter((candidate) => (
        candidate.osRequest.vendorId === mitra.vendorId
        && (
          candidate.email?.trim().toLowerCase() === mitra.email.trim().toLowerCase()
          || (mitra.mitraProfile?.nik && candidate.nik === mitra.mitraProfile.nik)
        )
      ))
      .flatMap((candidate) => candidate.skck ? [candidate.skck] : []);
    const matchingSkcks = [...matchingEmployeeSkcks, ...matchingCandidateSkcks]
      .filter((skck, index, skcks) => skcks.indexOf(skck) === index);

    if (matchingEmployeeSkcks.length === 0 && matchingCandidateSkcks.length === 0) {
      const matchingEmployees = (employeesByVendor.get(mitra.vendorId!) || []).filter((employee) => (
        employee.email.trim().toLowerCase() === mitra.email.trim().toLowerCase()
        || (mitra.mitraProfile?.nik && employee.nik === mitra.mitraProfile.nik)
      ));
      if (matchingEmployees.length > 0) {
        noRosterSkck += 1;
        continue;
      }
      noMatch += 1;
      continue;
    }
    if (matchingSkcks.length > 1) {
      ambiguousMatch += 1;
      continue;
    }

    const result = await prisma.mitraProfile.updateMany({
      where: { id: mitra.mitraProfile.id, skck: null },
      data: { skck: matchingSkcks[0] },
    });
    copied += result.count;
  }

  console.log("Backfill SKCK Mitra selesai.");
  console.log(`SKCK disalin dari roster yang cocok: ${copied}`);
  console.log(`Sudah memiliki SKCK: ${alreadyComplete}`);
  console.log(`Profil Mitra belum ada: ${missingProfile}`);
  console.log(`Tidak ada roster yang cocok: ${noMatch}`);
  console.log(`Roster cocok tanpa SKCK: ${noRosterSkck}`);
  console.log(`Kecocokan ambigu, tidak diubah: ${ambiguousMatch}`);
}

main()
  .catch((error) => {
    console.error("Backfill SKCK Mitra gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
