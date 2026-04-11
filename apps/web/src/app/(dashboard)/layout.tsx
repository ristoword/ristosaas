import { AppShell } from "@/components/layout/app-shell";
import { OrdersProvider } from "@/components/orders/orders-context";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OrdersProvider>
      <AppShell>{children}</AppShell>
    </OrdersProvider>
  );
}
