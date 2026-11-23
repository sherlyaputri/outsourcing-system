import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Hanya VM yang dapat mencatat absensi manual." }, { status: 403 });
    }
    const body = await req.json();
    const { userId, date: ymd, type, reason } = body;
    if (typeof userId !== "string" || typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return NextResponse.json({ error: "Mitra dan tanggal absensi wajib dipilih." }, { status: 400 });
    }
    if (!["HADIR", "IZIN", "SAKIT", "ALPHA"].includes(type)) {
      return NextResponse.json({ error: "Status absensi tidak valid." }, { status: 400 });
    }
    if (typeof reason !== "string" || !reason.trim() || reason.length > 2000) {
      return NextResponse.json({ error: "Alasan pencatatan manual wajib diisi, maksimal 2.000 karakter." }, { status: 400 });
    }
    const [year, month, day] = ymd.split("-").map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      return NextResponse.json({ error: "Tanggal absensi tidak valid." }, { status: 400 });
    }
    const date = new Date(calendarDate.getTime() - 7 * 60 * 60 * 1000);
    const mitra = await prisma.user.findFirst({ where: { id: userId, role: "MITRA" }, select: { id: true } });
    if (!mitra) return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    const existing = await prisma.attendance.findFirst({ where: { userId, date: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) } }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Absensi mitra pada tanggal tersebut sudah ada. Gunakan opsi Edit." }, { status: 409 });

    const attendance = await prisma.attendance.create({
      data: { userId, date, type, note: `[Manual oleh VM] ${reason.trim()}` },
    });
    return NextResponse.json(attendance, { status: 201 });
  } catch (error) {
    console.error("Manual attendance POST error:", error);
    return NextResponse.json({ error: "Gagal mencatat absensi manual." }, { status: 500 });
  }
}
