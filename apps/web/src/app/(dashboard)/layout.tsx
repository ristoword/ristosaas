import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/auth/auth-context";
import { HotelProvider } from "@/components/hotel/hotel-context";
import { OrdersProvider } from "@/components/orders/orders-context";
import { MenuProvider } from "@/components/menu/menu-context";
import { WarehouseProvider } from "@/components/warehouse/warehouse-context";

export default function DashboardGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <HotelProvider>
        <WarehouseProvider>
          <MenuProvider>
            <OrdersProvider>
              <AppShell>{children}</AppShell>
            </OrdersProvider>
          </MenuProvider>
        </WarehouseProvider>
      </HotelProvider>
    </AuthProvider>
  );
}
