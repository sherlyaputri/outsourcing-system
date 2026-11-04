import { NextRequest, NextResponse } from "next/server";

const regionResources = {
  provinces: "provinces",
  regencies: "regencies",
  districts: "districts",
  villages: "villages",
} as const;

type RegionLevel = keyof typeof regionResources;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const parentId = searchParams.get("parentId");

  if (!level || !Object.hasOwn(regionResources, level)) {
    return NextResponse.json({ error: "Tingkat wilayah tidak valid" }, { status: 400 });
  }

  const typedLevel = level as RegionLevel;
  if (typedLevel === "provinces" && parentId) {
    return NextResponse.json({ error: "Provinsi tidak membutuhkan parentId" }, { status: 400 });
  }
  if (typedLevel !== "provinces" && (!parentId || !/^\d+$/.test(parentId))) {
    return NextResponse.json({ error: "Kode wilayah induk tidak valid" }, { status: 400 });
  }

  const path = typedLevel === "provinces"
    ? "provinces.json"
    : `${regionResources[typedLevel]}/${parentId}.json`;

  try {
    const response = await fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/${path}`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      console.error(`Region catalog request failed (${response.status}): ${path}`);
      return NextResponse.json({ error: "Data wilayah gagal dimuat. Coba lagi nanti." }, { status: 502 });
    }

    const regions: unknown = await response.json();
    if (!Array.isArray(regions)) {
      console.error(`Region catalog returned an invalid response: ${path}`);
      return NextResponse.json({ error: "Format data wilayah tidak valid." }, { status: 502 });
    }

    return NextResponse.json(regions);
  } catch (error) {
    console.error("Region catalog GET error:", error);
    return NextResponse.json({ error: "Data wilayah gagal dimuat. Periksa koneksi lalu coba lagi." }, { status: 502 });
  }
}
