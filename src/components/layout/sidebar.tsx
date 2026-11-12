"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  ClipboardList,
  FileText,
  Receipt,
  Camera,
  History,
  CheckCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import VendorSettings from "./vendor-settings";
import ChangePasswordButton from "./change-password-button";

interface SidebarProps {
  role: string;
  userName: string;
  vendorName?: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: string): NavItem[] {
  const dashboardItem = {
    label: "Dashboard",
    href: `/dashboard/roles/${role.toLowerCase()}`,
    icon: <LayoutDashboard size={20} />,
  };

  switch (role) {
    case "MITRA":
      return [
        dashboardItem,
        { label: "Absensi", href: "/dashboard/absensi", icon: <Camera size={20} /> },
        { label: "Riwayat Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
      ];
    case "VENDOR":
      return [
        dashboardItem,
        { label: "Request OS", href: "/dashboard/request-os", icon: <FileText size={20} /> },
        { label: "Data Karyawan", href: "/dashboard/data-karyawan", icon: <Users size={20} /> },
        { label: "Data Mitra OS", href: "/dashboard/mitra", icon: <Users size={20} /> },
        { label: "Riwayat Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
        { label: "Daftar Klaim", href: "/dashboard/klaim", icon: <ClipboardList size={20} /> },
        { label: "Invoice", href: "/dashboard/invoice", icon: <Receipt size={20} /> },
      ];
    case "VM":
      return [
        dashboardItem,
        { label: "Data Vendor", href: "/dashboard/vendor", icon: <Building2 size={20} /> },
        { label: "Approval Akun", href: "/dashboard/approval-akun", icon: <UserCheck size={20} /> },
        { label: "Data Mitra OS", href: "/dashboard/mitra", icon: <Users size={20} /> },
        { label: "Data Absensi", href: "/dashboard/riwayat-absensi", icon: <History size={20} /> },
        { label: "Daftar Klaim", href: "/dashboard/klaim", icon: <ClipboardList size={20} /> },
        { label: "Daftar Invoice", href: "/dashboard/invoice", icon: <Receipt size={20} /> },
        { label: "Request OS", href: "/dashboard/request-os", icon: <FileText size={20} /> },
      ];
    case "SM":
      return [
        dashboardItem,
        { label: "Data Mitra OS", href: "/dashboard/mitra", icon: <Users size={20} /> },
        { label: "Request OS", href: "/dashboard/request-os", icon: <FileText size={20} /> },
      ];
    case "GM":
      return [
        dashboardItem,
        { label: "Approval Request", href: "/dashboard/approval", icon: <CheckCircle size={20} /> },
      ];
    case "COO":
      return [
        dashboardItem,
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
  const [notificationCounts, setNotificationCounts] = React.useState<Record<string, number>>({});
  const navItems = getNavItems(role);

  React.useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await fetch("/api/notifications");
        if (!response.ok) throw new Error(`Notification API returned ${response.status}`);
        const counts = await response.json() as Record<string, number>;
        if (active) setNotificationCounts(counts);
      } catch (error) {
        console.error("Sidebar notifications error:", error);
      }
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30_000);
    window.addEventListener("focus", loadNotifications);
    window.addEventListener("dashboard:notifications-refresh", loadNotifications);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
      window.removeEventListener("dashboard:notifications-refresh", loadNotifications);
    };
  }, [role, pathname]);

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
        <div className="relative flex flex-col items-center py-6 border-b">
          {role === "VENDOR" && <VendorSettings />}
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
              <span className="flex-1">{item.label}</span>
              {(notificationCounts[item.href] || 0) > 0 && (
                <span
                  aria-label={`${notificationCounts[item.href]} aksi atau pemberitahuan`}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold leading-none text-white"
                >
                  {notificationCounts[item.href]}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Account Actions & Logout */}
        <div className="p-3 border-t space-y-1">
          <ChangePasswordButton onOpened={() => setMobileOpen(false)} />
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
