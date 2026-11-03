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

    let where: any = {};

    if (session.user.role === "SM") {
      where.requesterId = session.user.id;
    }

    const requests = await prisma.oSRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        vendor: { select: { name: true } },
        approvals: {
          include: { approver: { select: { name: true, role: true } } },
          orderBy: { createdAt: "asc" },
        },
        candidates: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("OS Request GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, jumlah, posisi, penempatan, alasan } = body;

    if (!type || !["PENAMBAHAN", "PERGANTIAN", "PENGURANGAN"].includes(type)) {
      return NextResponse.json({ error: "Tipe request tidak valid" }, { status: 400 });
    }

    const osRequest = await prisma.oSRequest.create({
      data: {
        type,
        jumlah: jumlah || 1,
        posisi,
        penempatan,
        alasan,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    // If PENAMBAHAN, create GM approval
    if (type === "PENAMBAHAN") {
      const gmUsers = await prisma.user.findMany({ where: { role: "GM", status: "ACTIVE" } });
      for (const gm of gmUsers) {
        await prisma.approval.create({
          data: {
            osRequestId: osRequest.id,
            approverId: gm.id,
            creatorId: session.user.id,
            level: "GM",
            status: "PENDING",
          },
        });
      }
    } else {
      // PERGANTIAN or PENGURANGAN goes directly to VM for vendor selection
      await prisma.oSRequest.update({
        where: { id: osRequest.id },
        data: { status: "APPROVED_COO" }, // skip approval, go to VM
      });
    }

    return NextResponse.json(osRequest);
  } catch (error) {
    console.error("OS Request POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
