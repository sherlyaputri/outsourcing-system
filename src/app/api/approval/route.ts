import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["GM", "COO"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvals = await prisma.approval.findMany({
      where: { level: session.user.role },
      include: {
        osRequest: {
          include: { requester: { select: { name: true, role: true } } },
        },
        approver: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(approvals);
  } catch (error) {
    console.error("Approval GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["GM", "COO"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { approvalId, status, catatan } = body;

    if (!approvalId || typeof approvalId !== "string") {
      return NextResponse.json({ error: "ID approval tidak valid" }, { status: 400 });
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const trimmedNote = typeof catatan === "string" ? catatan.trim() : "";
    if (status === "REJECTED" && !trimmedNote) {
      return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
    }
    if (catatan !== undefined && catatan !== null && (typeof catatan !== "string" || trimmedNote.length > 2000)) {
      return NextResponse.json({ error: "Alasan penolakan maksimal 2.000 karakter." }, { status: 400 });
    }

    const existing = await prisma.approval.findUnique({ where: { id: approvalId } });
    if (!existing) {
      return NextResponse.json({ error: "Data approval tidak ditemukan" }, { status: 404 });
    }
    if (existing.level !== session.user.role) {
      return NextResponse.json({ error: "Anda tidak berwenang memproses approval level ini" }, { status: 403 });
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Approval ini sudah diproses sebelumnya" }, { status: 409 });
    }

    const approval = await prisma.approval.update({
      where: { id: approvalId },
      data: { status, catatan: trimmedNote || null },
    });

    // If GM approves, create COO approval
    if (session.user.role === "GM" && status === "APPROVED") {
      await prisma.oSRequest.update({
        where: { id: approval.osRequestId },
        data: { status: "APPROVED_GM" },
      });

      const cooUsers = await prisma.user.findMany({ where: { role: "COO", status: "ACTIVE" } });
      for (const coo of cooUsers) {
        await prisma.approval.create({
          data: {
            osRequestId: approval.osRequestId,
            approverId: coo.id,
            creatorId: session.user.id,
            level: "COO",
            status: "PENDING",
          },
        });
      }
    }

    // If COO approves, mark request as APPROVED_COO (ready for VM to pick vendor)
    if (session.user.role === "COO" && status === "APPROVED") {
      await prisma.oSRequest.update({
        where: { id: approval.osRequestId },
        data: { status: "APPROVED_COO" },
      });
    }

    // If rejected, update OS request status
    if (status === "REJECTED") {
      await prisma.oSRequest.update({
        where: { id: approval.osRequestId },
        data: { status: "REJECTED" },
      });
    }

    return NextResponse.json(approval);
  } catch (error) {
    console.error("Approval POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
