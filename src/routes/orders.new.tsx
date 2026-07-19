import { createFileRoute } from "@tanstack/react-router";
import { OrderEditor } from "@/components/OrderEditor";

export const Route = createFileRoute("/orders/new")({
  component: () => <OrderEditor />,
});
