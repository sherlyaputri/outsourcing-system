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

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const approval = await prisma.approval.update({
      where: { id: approvalId },
      data: { status, catatan },
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
