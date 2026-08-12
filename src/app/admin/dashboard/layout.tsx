import type { ReactNode } from "react";
import { AdminDashboardShell } from "@/components/admin/AdminDashboardShell";

export const dynamic = "force-dynamic";

export default function AdminDashboardLayout({ children }: { children: ReactNode }) {
  return <AdminDashboardShell>{children}</AdminDashboardShell>;
}
