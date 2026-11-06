import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getShiftEndAt } from "@/lib/attendance-shift";
import { getMitraShift } from "@/lib/mitra-shift";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const month = searchParams.get("month"); // format: YYYY-MM
    const vendorId = searchParams.get("vendorId");

    let where: any = {};

    if (session.user.role === "MITRA") {
      where.userId = session.user.id;
    } else if (session.user.role === "VENDOR") {
      where.user = { vendorId: session.user.vendorId };
    } else if (session.user.role === "VM") {
      if (vendorId) where.user = { vendorId };
      if (userId) where.userId = userId;
    }

    if (month) {
      const [year, m] = month.split("-").map(Number);
      where.date = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            vendorId: true,
            mitraProfile: { select: { waktuKerja: true } },
          },
        },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    if (session.user.role === "MITRA" && month) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const openAttendance = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: yesterday },
          checkIn: { not: null },
          checkOut: null,
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              vendorId: true,
              mitraProfile: { select: { waktuKerja: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      });
      if (openAttendance && !attendances.some(({ id }) => id === openAttendance.id)) {
        attendances.push(openAttendance);
        attendances.sort((first, second) => second.date.getTime() - first.date.getTime());
      }
    }

    const checkoutLocations = attendances.length
      ? await prisma.$queryRaw<Array<{
          id: string;
          latitudeCheckOut: number | null;
          longitudeCheckOut: number | null;
        }>>(Prisma.sql`
          SELECT id, latitudeCheckOut, longitudeCheckOut
          FROM Attendance
          WHERE id IN (${Prisma.join(attendances.map(({ id }) => id))})
        `)
      : [];
    const checkoutLocationById = new Map(checkoutLocations.map((location) => [location.id, location]));

    return NextResponse.json(attendances.map((attendance) => ({
      ...attendance,
      latitudeCheckOut: checkoutLocationById.get(attendance.id)?.latitudeCheckOut ?? null,
      longitudeCheckOut: checkoutLocationById.get(attendance.id)?.longitudeCheckOut ?? null,
    })));
  } catch (error) {
    console.error("Attendance GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "MITRA") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, fotoCheckIn, latitude, longitude, note } = body;
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json({ error: "Lokasi GPS tidak valid. Silakan ambil foto absensi kembali." }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (body.isCheckOut === true) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const existing = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: yesterday, lt: tomorrow },
          checkIn: { not: null },
          checkOut: null,
        },
        orderBy: { date: "desc" },
      });
      if (!existing?.checkIn) {
        return NextResponse.json({ error: "Tidak ada absensi check-in yang perlu diakhiri." }, { status: 400 });
      }

      const shift = await getMitraShift(session.user.id, session.user.email);
      const scheduledEnd = getShiftEndAt(existing.checkIn, shift);
      if (!scheduledEnd) {
        return NextResponse.json({ error: "Jadwal shift belum tersedia. Hubungi vendor atau administrator." }, { status: 409 });
      }
      const checkedOutAt = new Date();
      if (checkedOutAt < scheduledEnd) {
        return NextResponse.json({
          error: `Anda belum dapat check-out. Jadwal shift berakhir pukul ${new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
          }).format(scheduledEnd)} WIB.`,
        }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const attendance = await tx.attendance.update({
          where: { id: existing.id },
          data: {
            checkOut: checkedOutAt,
            fotoCheckOut: body.fotoCheckOut,
          },
        });
        await tx.$executeRaw(Prisma.sql`
          UPDATE Attendance
          SET latitudeCheckOut = ${latitude}, longitudeCheckOut = ${longitude}
          WHERE id = ${existing.id}
        `);
        return attendance;
      });
      return NextResponse.json({ ...updated, latitudeCheckOut: latitude, longitudeCheckOut: longitude });
    }

    const existingToday = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
    });
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: { gte: new Date(Date.now() - 36 * 60 * 60 * 1000) },
        checkIn: { not: null },
        checkOut: null,
      },
    });
    if (existingToday?.checkIn || openAttendance) {
      return NextResponse.json({ error: "Anda sudah check-in dan belum melakukan check-out." }, { status: 400 });
    }

    // Create new check-in
    const attendance = await prisma.attendance.create({
      data: {
        userId: session.user.id,
        date: new Date(),
        checkIn: new Date(),
        type: type || "HADIR",
        fotoCheckIn,
        latitude,
        longitude,
        note,
      },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("Attendance POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
