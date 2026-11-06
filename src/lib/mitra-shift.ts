import { prisma } from "@/lib/prisma";

export async function getMitraShift(userId: string, email?: string | null) {
  const profile = await prisma.mitraProfile.findUnique({
    where: { userId },
    select: { waktuKerja: true },
  });
  if (profile?.waktuKerja) return profile.waktuKerja;

  if (!email) return null;
  const activatedCandidate = await prisma.candidate.findFirst({
    where: { email, status: "ACTIVATED" },
    orderBy: { updatedAt: "desc" },
    select: { osRequest: { select: { waktuKerja: true } } },
  });
  return activatedCandidate?.osRequest.waktuKerja ?? null;
}
