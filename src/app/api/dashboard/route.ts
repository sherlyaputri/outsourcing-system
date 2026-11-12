import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMitraShift } from "@/lib/mitra-shift";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, vendorId } = session.user;
    let stats: any = {};

    if (role === "MITRA") {
      const totalAbsensi = await prisma.attendance.count({
        where: { userId: session.user.id },
      });
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const absensiTerbuka = await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: { gte: yesterday },
          checkIn: { not: null },
          checkOut: null,
        },
        orderBy: { date: "desc" },
      });
      const absensiHariIni = absensiTerbuka || await prisma.attendance.findFirst({
        where: {
          userId: session.user.id,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      });
      const waktuKerja = await getMitraShift(session.user.id, session.user.email);
      stats = { totalAbsensi, sudahAbsenHariIni: !!absensiHariIni, absensiHariIni, waktuKerja };
    } else if (role === "VENDOR") {
      const totalMitra = await prisma.user.count({
        where: { vendorId, role: "MITRA", status: "ACTIVE" },
      });
      const totalKlaim = await prisma.claim.count({ where: { vendorId: vendorId! } });
      const totalInvoice = await prisma.invoice.count({ where: { vendorId: vendorId! } });
      const pendingAccountReqs = await prisma.accountRequest.count({
        where: { requesterId: session.user.id, status: "PENDING" },
      });
      stats = { totalMitra, totalKlaim, totalInvoice, pendingAccountReqs };
    } else if (role === "VM") {
      const totalVendor = await prisma.vendor.count({ where: { status: "ACTIVE" } });
      const totalMitra = await prisma.user.count({ where: { role: "MITRA", status: "ACTIVE" } });
      const [pendingAccountRequests, pendingVendors] = await Promise.all([
        prisma.accountRequest.count({ where: { status: "PENDING" } }),
        prisma.vendor.count({ where: { status: "PENDING" } }),
      ]);
      const pendingApprovals = pendingAccountRequests + pendingVendors;
      const pendingRequests = await prisma.oSRequest.count({
        where: { status: { in: ["APPROVED_COO", "VENDOR_SELECTED"] } },
      });
      const totalKlaim = await prisma.claim.count({ where: { status: "SUBMITTED" } });
      const totalInvoice = await prisma.invoice.count({ where: { status: "SUBMITTED" } });
      stats = { totalVendor, totalMitra, pendingApprovals, pendingRequests, totalKlaim, totalInvoice };
    } else if (role === "SM") {
      const myRequests = await prisma.oSRequest.count({
        where: { requesterId: session.user.id },
      });
      const pendingRequests = await prisma.oSRequest.count({
        where: { requesterId: session.user.id, status: "PENDING" },
      });
      const approvedRequests = await prisma.oSRequest.count({
        where: { requesterId: session.user.id, status: "COMPLETED" },
      });
      stats = { myRequests, pendingRequests, approvedRequests };
    } else if (role === "GM" || role === "COO") {
      const level = role;
      const pendingApprovals = await prisma.approval.count({
        where: { level, status: "PENDING" },
      });
      const approvedTotal = await prisma.approval.count({
        where: { level, status: "APPROVED" },
      });
      const rejectedTotal = await prisma.approval.count({
        where: { level, status: "REJECTED" },
      });
      stats = { pendingApprovals, approvedTotal, rejectedTotal };
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
