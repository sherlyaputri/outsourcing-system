import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["MITRA", "VENDOR"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.role === "MITRA" ? session.user.id : new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Mitra tidak valid." }, { status: 400 });
  const profile = await prisma.mitraProfile.findFirst({
    where: { userId, ...(session.user.role === "VENDOR" ? { vendorId: session.user.vendorId || "" } : {}) },
    select: { skbnDeadlineAt: true, user: { select: { status: true } }, documents: { where: { name: "SKBN" }, select: { id: true, mimeType: true }, take: 1 } },
  });
  if (!profile) return NextResponse.json({ error: "Profil Mitra tidak ditemukan." }, { status: 404 });
  if (!["ACTIVE", "CLOSED"].includes(profile.user.status)) return NextResponse.json({ error: "SKBN diserahkan setelah akun Mitra diaktivasi." }, { status: 409 });
  return NextResponse.json({ deadline: profile.skbnDeadlineAt, uploaded: profile.documents.length > 0 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !["MITRA", "VENDOR"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const userId = session.user.role === "MITRA" ? session.user.id : body.userId;
  if (typeof userId !== "string") return NextResponse.json({ error: "Mitra tidak valid." }, { status: 400 });
  const profile = await prisma.mitraProfile.findFirst({
    where: { userId, ...(session.user.role === "VENDOR" ? { vendorId: session.user.vendorId || "" } : {}) },
    select: { id: true, skbnDeadlineAt: true, user: { select: { status: true } }, documents: { where: { name: "SKBN" }, select: { id: true }, take: 1 } },
  });
  if (!profile) return NextResponse.json({ error: "Profil Mitra tidak ditemukan." }, { status: 404 });
  if (!["ACTIVE", "CLOSED"].includes(profile.user.status)) return NextResponse.json({ error: "SKBN diserahkan setelah akun Mitra diaktivasi." }, { status: 409 });
  const skbn = body.skbn;
  if (typeof skbn !== "string") return NextResponse.json({ error: "File SKBN tidak valid." }, { status: 400 });
  const match = skbn.match(/^data:(application\/pdf|image\/jpeg|image\/png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || Buffer.from(match[2], "base64").length === 0 || Buffer.from(match[2], "base64").length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "SKBN harus PDF/JPG/PNG maksimal 5 MB." }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.mitraDocument.deleteMany({ where: { mitraProfileId: profile.id, name: "SKBN" } });
    await tx.mitraDocument.create({ data: { mitraProfileId: profile.id, name: "SKBN", mimeType: match[1], content: skbn } });
    if (profile.skbnDeadlineAt && profile.skbnDeadlineAt <= new Date() && profile.documents.length === 0) {
      await tx.user.update({ where: { id: userId }, data: { status: "CLOSED" } });
    }
  });
  return NextResponse.json({ success: true });
}
