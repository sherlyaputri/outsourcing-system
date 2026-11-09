import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const counts: Record<string, number> = {};
    if (session.user.role === "MITRA") {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      const openAttendance = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: yesterday },
          checkIn: { not: null },
          checkOut: null,
        },
        orderBy: { date: "desc" },
        select: { checkIn: true, checkOut: true },
      });
      const todayAttendance = openAttendance || await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: startOfToday },
        },
        orderBy: { date: "desc" },
        select: { checkIn: true, checkOut: true },
      });
      counts["/dashboard/absensi"] = todayAttendance?.checkIn && todayAttendance.checkOut ? 0 : 1;
    } else if (session.user.role === "VENDOR" && session.user.vendorId) {
      const notificationWindowStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const [requests, recentChanges, incompleteEmployees, incompleteMitraProfiles, mitraDocumentProfiles] = await Promise.all([
        prisma.oSRequest.count({
          where: {
            vendorId: session.user.vendorId,
            status: { in: ["VENDOR_SELECTED", "WAITING_VENDOR_REQUEST"] },
          },
        }),
        prisma.oSRequest.count({
          where: {
            vendorId: session.user.vendorId,
            vendorNotifiedAt: { gte: notificationWindowStart },
            type: { in: ["PENAMBAHAN", "PERGANTIAN", "PENGURANGAN"] },
          },
        }),
        prisma.vendorEmployee.count({
          where: { vendorId: session.user.vendorId, status: { in: ["ACTIVE", "IN_SELECTION"] }, skck: null },
        }),
        prisma.mitraProfile.count({
          where: { vendorId: session.user.vendorId, waktuKerja: null },
        }),
        prisma.mitraProfile.findMany({
          where: { vendorId: session.user.vendorId, dokumenDeadlineAt: { not: null } },
          select: { documents: { select: { name: true } } },
        }),
      ]);
      const requiredDocuments = ["Ijazah", "Kartu Keluarga", "Foto Seluruh Badan", "SKBN"];
      const incompleteAdditionalDocuments = mitraDocumentProfiles.filter((profile) =>
        requiredDocuments.some((name) => !profile.documents.some((document) => document.name === name)),
      ).length;
      counts["/dashboard/request-os"] = requests + recentChanges;
      counts["/dashboard/data-karyawan"] = incompleteEmployees;
      counts["/dashboard/mitra"] = incompleteMitraProfiles + incompleteAdditionalDocuments;
    } else if (session.user.role === "VM") {
      const [accountRequests, osRequests] = await Promise.all([
        prisma.accountRequest.count({ where: { status: "PENDING" } }),
        prisma.oSRequest.count({ where: { status: "APPROVED_COO" } }),
      ]);
      counts["/dashboard/approval-akun"] = accountRequests;
      counts["/dashboard/request-os"] = osRequests;
    } else if (session.user.role === "SM") {
      counts["/dashboard/request-os"] = await prisma.candidate.count({
        where: {
          status: "KANDIDAT",
          osRequest: { requesterId: session.user.id },
        },
      });
    } else if (session.user.role === "GM" || session.user.role === "COO") {
      counts["/dashboard/approval"] = await prisma.approval.count({
        where: { level: session.user.role, status: "PENDING" },
      });
    }

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
