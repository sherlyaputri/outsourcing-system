import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let where: any = {};

    if (session.user.role === "VENDOR") {
      where.requesterId = session.user.id;
    }

    const requests = await prisma.accountRequest.findMany({
      where,
      include: {
        requester: { select: { name: true, role: true } },
        handler: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Account Request GET error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VENDOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, phone } = body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const request = await prisma.accountRequest.create({
      data: {
        type: "MITRA",
        name,
        email,
        phone,
        vendorId: session.user.vendorId,
        requesterId: session.user.id,
        status: "PENDING",
      },
    });

    return NextResponse.json(request);
  } catch (error) {
    console.error("Account Request POST error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "VM") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, status, catatan } = body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    const accountReq = await prisma.accountRequest.findUnique({
      where: { id: requestId },
    });

    if (!accountReq) {
      return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.accountRequest.update({
      where: { id: requestId },
      data: {
        status,
        catatan,
        handlerId: session.user.id,
      },
    });

    // If approved, create the user account with PENDING status
    if (status === "APPROVED") {
      const hashedPassword = await bcrypt.hash("mitra123", 10);
      await prisma.user.create({
        data: {
          email: accountReq.email,
          password: hashedPassword,
          name: accountReq.name,
          role: "MITRA",
          status: "ACTIVE", // Active after VM approval
          phone: accountReq.phone,
          vendorId: accountReq.vendorId,
        },
      });

      await prisma.accountRequest.update({
        where: { id: requestId },
        data: { status: "ACTIVATED" },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Account Request PATCH error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
