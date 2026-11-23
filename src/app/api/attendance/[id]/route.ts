import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Hanya VM yang dapat mengedit absensi." }, { status: 403 });
    }

    const body = await req.json();
    const validTypes = ["HADIR", "ALPHA"];
    if (typeof body.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !validTypes.includes(body.type)) {
      return NextResponse.json({ error: "Tanggal atau status absensi tidak valid." }, { status: 400 });
    }
    const [year, month, day] = body.date.split("-").map(Number);
    const calendarDate = new Date(Date.UTC(year, month - 1, day));
    if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) {
      return NextResponse.json({ error: "Tanggal absensi tidak valid." }, { status: 400 });
    }
    const date = new Date(calendarDate.getTime() - 7 * 60 * 60 * 1000);

    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length > 2000 || typeof body.userId !== "string") {
      return NextResponse.json({ error: "Nama mitra dan alasan perubahan wajib diisi." }, { status: 400 });
    }

    const attendance = await prisma.attendance.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true, user: { select: { role: true } } },
    });
    if (!attendance || attendance.user.role !== "MITRA") {
      return NextResponse.json({ error: "Data absensi mitra tidak ditemukan." }, { status: 404 });
    }
    const target = await prisma.user.findFirst({ where: { id: body.userId, role: "MITRA" }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "Mitra tidak ditemukan." }, { status: 404 });
    if (target.id !== attendance.userId) {
      const duplicate = await prisma.attendance.findFirst({
        where: { id: { not: attendance.id }, userId: target.id, date: { gte: date, lt: new Date(date.getTime() + 24 * 60 * 60 * 1000) } },
        select: { id: true },
      });
      if (duplicate) return NextResponse.json({ error: "Mitra tersebut sudah memiliki absensi pada tanggal ini." }, { status: 409 });
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { date, userId: target.id, type: body.type, note: `[Koreksi VM] ${reason}` },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Attendance PATCH error:", error);
    return NextResponse.json({ error: "Gagal memperbarui data absensi." }, { status: 500 });
  }
}
