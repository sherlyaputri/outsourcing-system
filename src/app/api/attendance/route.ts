import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
      include: { user: { select: { name: true, email: true, vendorId: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json(attendances);
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: session.user.id,
        date: { gte: today, lt: tomorrow },
      },
    });

    if (existing && existing.checkIn && !body.isCheckOut) {
      return NextResponse.json({ error: "Anda sudah check-in hari ini" }, { status: 400 });
    }

    if (body.isCheckOut && existing) {
      // Update for check-out
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOut: new Date(),
          fotoCheckOut: body.fotoCheckOut,
        },
      });
      return NextResponse.json(updated);
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
