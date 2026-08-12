import { ProductEditorClient } from "@/components/admin/ProductEditorClient";

export const dynamic = "force-dynamic";

export default function DashboardProductsPage() {
  return <ProductEditorClient embedded />;
}
