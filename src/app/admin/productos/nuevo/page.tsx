import { createProductAction } from "@/actions/admin/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, emptyProduct } from "@/components/admin/product-form";
import { requireRole } from "@/lib/session";

export default async function NewProductPage() {
  await requireRole("ADMIN");
  return (
    <>
      <PageHeader title="Nuevo producto" />
      <ProductForm action={createProductAction} initial={emptyProduct} isNew />
    </>
  );
}
