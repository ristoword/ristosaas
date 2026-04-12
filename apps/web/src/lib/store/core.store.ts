import { uid } from "@/lib/store/id";
import { recipesStore } from "@/lib/store/modules/kitchen.store";
import { menuItemsStore, dailyDishesStore } from "@/lib/store/modules/menu.store";
import { ordersStore } from "@/lib/store/modules/orders.store";
import { roomsStore } from "@/lib/store/modules/rooms.store";
import { tablesStore } from "@/lib/store/modules/tables.store";
import { stockStore, stockMovementsStore } from "@/lib/store/modules/warehouse.store";
import { hotelStore, hotelCheckIn, hotelCheckOut } from "@/lib/store/modules/hotel.store";
import { closeGuestFolioForCheckout, integrationStore, postRestaurantChargeToRoom } from "@/lib/store/modules/integration.store";

export { uid };

export const db = {
  recipes: recipesStore,
  menuItems: menuItemsStore,
  dailyDishes: dailyDishesStore,
  orders: ordersStore,
  rooms: roomsStore,
  tables: tablesStore,
  stock: stockStore,
  stockMovements: stockMovementsStore,
  hotel: hotelStore,
  integration: integrationStore,
  hotelCheckIn,
  hotelCheckOut,
  postRestaurantChargeToRoom,
  closeGuestFolioForCheckout,
};
