import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Akun Vendor OS dibuat oleh VM melalui menu Data Vendor." }, { status: 410 });
}
