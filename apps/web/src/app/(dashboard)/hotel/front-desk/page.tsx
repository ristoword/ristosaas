import { Suspense } from "react";
import { HotelFrontDeskPage } from "@/components/hotel/hotel-front-desk-page";

export default function HotelFrontDeskRoute() {
  return (
    <Suspense fallback={null}>
      <HotelFrontDeskPage />
    </Suspense>
  );
}
