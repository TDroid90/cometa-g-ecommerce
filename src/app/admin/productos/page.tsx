import { redirect } from "next/navigation";

export default function LegacyAdminProductsPage() {
  redirect("/admin/dashboard/productos");
}
