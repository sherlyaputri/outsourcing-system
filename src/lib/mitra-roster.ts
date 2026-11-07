import { Prisma } from "@prisma/client";

export class MitraRosterDataIncompleteError extends Error {}

export async function returnMitraToRoster(
  tx: Prisma.TransactionClient,
  mitraProfileId: string,
) {
  const profile = await tx.mitraProfile.findUnique({
    where: { id: mitraProfileId },
    include: { user: true },
  });
  if (!profile) {
    throw new Error(`Mitra profile ${mitraProfileId} was not found`);
  }

  const requiredValues: [string, string | null][] = [
    ["NIK", profile.nik],
    ["Foto KTP", profile.fotoKtp],
    ["Jenis SIM", profile.jenisSim],
    ["Nomor SIM", profile.noSim],
    ["Foto SIM", profile.fotoSim],
    ["SKCK", profile.skck],
    ["No. HP", profile.user.phone],
    ["Email", profile.user.email],
    ["Alamat", profile.alamat],
    ["Kelurahan/Desa", profile.kelurahan],
    ["Kecamatan", profile.kecamatan],
    ["Kabupaten/Kota", profile.kabKota],
    ["Provinsi", profile.provinsi],
  ];
  const missingFields = requiredValues.filter(([, value]) => !value?.trim()).map(([label]) => label);
  if (missingFields.length > 0) {
    throw new MitraRosterDataIncompleteError(
      `Data ${profile.user.name} belum lengkap untuk dikembalikan ke roster. Lengkapi: ${missingFields.join(", ")}. Data lain yang berlabel opsional tidak perlu dilengkapi.`,
    );
  }

  const employeeData = {
    vendorId: profile.vendorId,
    name: profile.user.name,
    nik: profile.nik!,
    fotoKtp: profile.fotoKtp!,
    jenisSim: profile.jenisSim!,
    noSim: profile.noSim!,
    fotoSim: profile.fotoSim!,
    skck: profile.skck,
    phone: profile.user.phone!,
    email: profile.user.email,
    alamat: profile.alamat!,
    kelurahan: profile.kelurahan!,
    kecamatan: profile.kecamatan!,
    kabKota: profile.kabKota!,
    provinsi: profile.provinsi!,
    status: "ACTIVE",
  };
  const existingEmployee = await tx.vendorEmployee.findFirst({
    where: {
      vendorId: profile.vendorId,
      OR: [
        { email: profile.user.email },
        { nik: profile.nik! },
      ],
    },
    select: { id: true },
  });

  if (existingEmployee) {
    await tx.vendorEmployee.update({
      where: { id: existingEmployee.id },
      data: employeeData,
    });
  } else {
    await tx.vendorEmployee.create({ data: employeeData });
  }

  await tx.mitraProfile.update({
    where: { id: profile.id },
    data: { status: "REPLACED", endDate: new Date() },
  });
  await tx.user.update({
    where: { id: profile.userId },
    data: { status: "INACTIVE" },
  });
}
