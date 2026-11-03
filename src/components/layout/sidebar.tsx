"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  FileText,
  Receipt,
  Camera,
  History,
  Building2,
  UserPlus,
  CheckCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  role: string;
  userName: string;
  vendorName?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  switch (role) {
    case "MITRA":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Absensi", href: "/dashboard/absensi", icon: <Camera size={20} /> },
        { label: "Riwayat Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
      ];
    case "VENDOR":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Data Mitra OS", href: "/dashboard/mitra", icon: <Users size={20} /> },
        { label: "Riwayat Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
        { label: "Daftar Klaim", href: "/dashboard/klaim", icon: <ClipboardList size={20} /> },
        { label: "Invoice", href: "/dashboard/invoice", icon: <Receipt size={20} /> },
        { label: "Ajukan Akun Mitra", href: "/dashboard/akun-mitra", icon: <UserPlus size={20} /> },
      ];
    case "VM":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Pilih Vendor", href: "/dashboard/vendor", icon: <Building2 size={20} /> },
        { label: "Approval Akun", href: "/dashboard/approval-akun", icon: <UserCheck size={20} /> },
        { label: "Data Mitra OS", href: "/dashboard/mitra", icon: <Users size={20} /> },
        { label: "Data Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
        { label: "Daftar Klaim", href: "/dashboard/klaim", icon: <ClipboardList size={20} /> },
        { label: "Daftar Invoice", href: "/dashboard/invoice", icon: <Receipt size={20} /> },
        { label: "Request OS", href: "/dashboard/request-os", icon: <FileText size={20} /> },
      ];
    case "SM":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Request OS", href: "/dashboard/request-os", icon: <FileText size={20} /> },
      ];
    case "GM":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Approval Request", href: "/dashboard/approval", icon: <CheckCircle size={20} /> },
      ];
    case "COO":
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
        { label: "Approval Request", href: "/dashboard/approval", icon: <CheckCircle size={20} /> },
      ];
    default:
      return [];
  }
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    MITRA: "Mitra OS",
    VENDOR: "Vendor OS",
    VM: "Vendor Manager",
    SM: "Site Manager",
    GM: "General Manager",
    COO: "Chief Operating Officer",
  };
  return labels[role] || role;
}

export default function Sidebar({ role, userName, vendorName }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = getNavItems(role);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-md"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 bg-white border-r shadow-sm transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex flex-col items-center py-6 border-b">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl">
            OS
          </div>
          <h1 className="mt-2 font-bold text-lg">Outsourcing System</h1>
          <span className="text-xs text-muted-foreground">{getRoleLabel(role)}</span>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="font-medium text-sm truncate">{userName}</p>
          {vendorName && <p className="text-xs text-muted-foreground truncate">{vendorName}</p>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-white"
                  : "text-gray-700 hover:bg-muted"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Keluar
          </button>
        </div>
      </aside>
    </>
  );
}
