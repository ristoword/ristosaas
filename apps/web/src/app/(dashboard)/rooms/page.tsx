import type { Metadata } from "next";
import { SalaPage } from "@/components/sala/sala-page";

export const metadata: Metadata = {
  title: "Sala",
  description: "Planimetria tavoli e azioni touch per la sala.",
};

export default function RoomsPage() {
  return <SalaPage />;
}
