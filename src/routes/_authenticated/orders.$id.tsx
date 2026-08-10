import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { OrderEditor } from "@/components/OrderEditor";
import { fetchOrder } from "@/lib/supabase-queries";

export const Route = createFileRoute("/_authenticated/orders/$id")({
  component: OrderDetail,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-muted-foreground">Loading…</div>
      </AppLayout>
    );
  }
  if (error || !data) {
    return (
      <AppLayout>
        <div className="py-20 text-center text-destructive">Order not found.</div>
      </AppLayout>
    );
  }
  return <OrderEditor orderId={id} initialOrder={data.order} initialItems={data.items} />;
}
