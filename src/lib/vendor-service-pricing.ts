export const VENDOR_POSITIONS = [
  { code: "OS001", label: "Sorter" },
  { code: "OS002", label: "Driver Delivery & Pickup" },
  { code: "OS003", label: "Kurir Perpaket" },
  { code: "OS004", label: "Kurir Dedicated" },
  { code: "OS005", label: "Driver Ondemand" },
] as const;

export const VENDOR_LOCATIONS = ["kantor1", "kantor2", "kantor3"] as const;

export type VendorServicePrice = {
  positionCode: string;
  locationCode: string;
  dailyRate: number;
  managementFeeRate: number;
};

export function getPositionCode(position?: string | null) {
  return position?.split(":")[0]?.trim() || "";
}

export function parseVendorPositionCodes(value?: string | null): string[] {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function parseVendorServicePricing(value?: string | null): VendorServicePrice[] {
  try {
    const parsed: unknown = value ? JSON.parse(value) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is VendorServicePrice => Boolean(
      item && typeof item === "object"
      && typeof item.positionCode === "string"
      && typeof item.locationCode === "string"
      && Number.isFinite(item.dailyRate)
      && Number.isFinite(item.managementFeeRate),
    ));
  } catch {
    return [];
  }
}
