import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AttendanceSessionUser {
  id: string;
  role: string;
  vendorId?: string | null;
}

export function parseYmdDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 0, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function getJakartaYmd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const ATTENDANCE_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      vendorId: true,
      mitraProfile: {
        select: {
          waktuKerja: true,
          idMitraOs: true,
          status: true,
          posisi: true,
          penempatan: true,
        },
      },
    },
  },
} as const;

export async function queryAttendances(
  sessionUser: AttendanceSessionUser,
  searchParams: URLSearchParams,
  options?: { takeLimit?: number }
) {
  const filterUserId = searchParams.get("userId");
  const month = searchParams.get("month");
  const date = searchParams.get("date");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const vendorId = searchParams.get("vendorId");

  let where: any = {};

  if (sessionUser.role === "MITRA") {
    where.userId = sessionUser.id;
  } else if (sessionUser.role === "VENDOR") {
    where.user = { vendorId: sessionUser.vendorId };
    if (filterUserId) where.userId = filterUserId;
  } else if (sessionUser.role === "VM") {
    if (vendorId) where.user = { vendorId };
    if (filterUserId) where.userId = filterUserId;
  }

  const exactDate = parseYmdDate(date);
  const rawStart = parseYmdDate(startDate);
  const rawEnd = parseYmdDate(endDate);
  const [rangeStart, rangeEnd] =
    rawStart && rawEnd && rawStart > rawEnd ? [rawEnd, rawStart] : [rawStart, rawEnd];
  const hasExplicitDateFilter = Boolean(exactDate || rangeStart || rangeEnd);

  if (exactDate) {
    const nextDay = new Date(
      exactDate.getFullYear(),
      exactDate.getMonth(),
      exactDate.getDate() + 1,
      0,
      0,
      0,
      0
    );
    where.date = {
      gte: exactDate,
      lt: nextDay,
    };
  } else if (rangeStart || rangeEnd) {
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (rangeStart) {
      dateFilter.gte = rangeStart;
    }
    if (rangeEnd) {
      dateFilter.lt = new Date(
        rangeEnd.getFullYear(),
        rangeEnd.getMonth(),
        rangeEnd.getDate() + 1,
        0,
        0,
        0,
        0
      );
    }
    where.date = dateFilter;
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [year, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(year, m - 1, 1),
      lt: new Date(year, m, 1),
    };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    include: ATTENDANCE_INCLUDE,
    orderBy: { date: "desc" },
    take: options?.takeLimit ?? (where.date ? 5000 : 100),
  });

  if (sessionUser.role === "MITRA" && !hasExplicitDateFilter) {
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: sessionUser.id,
        checkIn: { not: null },
        checkOut: null,
      },
      include: ATTENDANCE_INCLUDE,
      orderBy: [{ date: "desc" }, { checkIn: "desc" }],
    });
    if (openAttendance && !attendances.some(({ id }) => id === openAttendance.id)) {
      attendances.push(openAttendance);
      attendances.sort((first, second) =>
        second.date.getTime() - first.date.getTime()
        || (second.checkIn?.getTime() || 0) - (first.checkIn?.getTime() || 0),
      );
    }
  }

  const checkoutLocations = attendances.length
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          latitudeCheckOut: number | null;
          longitudeCheckOut: number | null;
        }>
      >(Prisma.sql`
        SELECT id, latitudeCheckOut, longitudeCheckOut
        FROM Attendance
        WHERE id IN (${Prisma.join(attendances.map(({ id }) => id))})
      `)
    : [];
  const checkoutLocationById = new Map(
    checkoutLocations.map((location) => [location.id, location])
  );

  return attendances.map((attendance) => ({
    ...attendance,
    latitudeCheckOut: checkoutLocationById.get(attendance.id)?.latitudeCheckOut ?? null,
    longitudeCheckOut: checkoutLocationById.get(attendance.id)?.longitudeCheckOut ?? null,
  }));
}

