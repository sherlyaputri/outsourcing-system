import React from "react";
import { getStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isGreen = ["ACTIVE", "ACTIVATED", "APPROVED", "TERPILIH", "HADIR", "PAID", "COMPLETED", "HIRED"].includes(status);
  const isRed = ["INACTIVE", "REJECTED", "DITOLAK", "ALPHA", "OS_NOT_SELECTED", "TIDAK_AKTIF", "NONAKTIF"].includes(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-colors",
        getStatusColor(status),
        className
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          isGreen ? "bg-green-600" : isRed ? "bg-red-600" : "bg-current opacity-60"
        )}
      />
      {getStatusLabel(status)}
    </span>
  );
}
