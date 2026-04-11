import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Archive,
  BarChart3,
  BookUser,
  ChefHat,
  ClipboardList,
  Coffee,
  CreditCard,
  FileText,
  LayoutDashboard,
  MapPin,
  Monitor,
  Package,
  Pizza,
  QrCode,
  Settings,
  ShoppingBag,
  Soup,
  Star,
  Store,
  Truck,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  ready: boolean;
};

export type NavSection = { title: string; items: NavItem[] };

export const navSections: NavSection[] = [
  {
    title: "Oggi",
    items: [
      {
        id: "dashboard",
        label: "Panoramica",
        hint: "Tutto quello che conta, in un colpo d'occhio.",
        href: "/dashboard",
        icon: LayoutDashboard,
        ready: true,
      },
    ],
  },
  {
    title: "Operatività",
    items: [
      {
        id: "rooms",
        label: "Sala",
        hint: "Planimetria touch, tavoli e azioni.",
        href: "/rooms",
        icon: Armchair,
        ready: true,
      },
      {
        id: "cucina",
        label: "Cucina",
        hint: "KDS comande, ricette, HACCP.",
        href: "/cucina",
        icon: ChefHat,
        ready: true,
      },
      {
        id: "pizzeria",
        label: "Pizzeria",
        hint: "KDS pizze, ricette, note.",
        href: "/pizzeria",
        icon: Pizza,
        ready: true,
      },
      {
        id: "bar",
        label: "Bar",
        hint: "KDS bevande, cocktail, note.",
        href: "/bar",
        icon: Wine,
        ready: true,
      },
      {
        id: "cassa",
        label: "Cassa",
        hint: "POS, conti, pagamenti.",
        href: "/cassa",
        icon: CreditCard,
        ready: true,
      },
      {
        id: "asporto",
        label: "Asporto",
        hint: "Ordini da asporto e consegne.",
        href: "/asporto",
        icon: ShoppingBag,
        ready: true,
      },
      {
        id: "prenotazioni",
        label: "Prenotazioni",
        hint: "Agenda e disponibilità.",
        href: "/prenotazioni",
        icon: ClipboardList,
        ready: true,
      },
    ],
  },
  {
    title: "Gestione",
    items: [
      {
        id: "magazzino",
        label: "Magazzino",
        hint: "Inventario, ricezione, movimenti.",
        href: "/magazzino",
        icon: Package,
        ready: true,
      },
      {
        id: "fornitori",
        label: "Fornitori",
        hint: "Anagrafica, ordini, fatture.",
        href: "/fornitori",
        icon: Truck,
        ready: true,
      },
      {
        id: "menu-admin",
        label: "Menu Admin",
        hint: "Piatti, prezzi, food cost.",
        href: "/menu-admin",
        icon: Soup,
        ready: true,
      },
      {
        id: "daily-menu",
        label: "Menu del Giorno",
        hint: "Piatti del giorno attivi.",
        href: "/daily-menu",
        icon: Star,
        ready: true,
      },
      {
        id: "food-cost",
        label: "Food Cost",
        hint: "Calcolo costi e margini.",
        href: "/food-cost",
        icon: FileText,
        ready: true,
      },
      {
        id: "catering",
        label: "Catering",
        hint: "Preset, eventi, calcolatore.",
        href: "/catering",
        icon: UtensilsCrossed,
        ready: true,
      },
    ],
  },
  {
    title: "Persone",
    items: [
      {
        id: "staff",
        label: "Staff",
        hint: "Dipendenti, turni, presenze.",
        href: "/staff",
        icon: Users,
        ready: true,
      },
      {
        id: "supervisor",
        label: "Supervisor",
        hint: "KPI, report, controllo totale.",
        href: "/supervisor",
        icon: BarChart3,
        ready: true,
      },
    ],
  },
  {
    title: "Archivio",
    items: [
      {
        id: "archivio",
        label: "Archivio",
        hint: "Incassi, fatture, comande.",
        href: "/archivio",
        icon: Archive,
        ready: true,
      },
    ],
  },
  {
    title: "Sistema",
    items: [
      {
        id: "hardware",
        label: "Hardware / Stampa",
        hint: "Stampanti, rotte, coda.",
        href: "/hardware",
        icon: Monitor,
        ready: true,
      },
      {
        id: "qr-tables",
        label: "QR Tavoli",
        hint: "Codici QR per ogni tavolo.",
        href: "/qr-tables",
        icon: QrCode,
        ready: true,
      },
      {
        id: "owner",
        label: "Area Owner",
        hint: "Licenza, SMTP, configurazione.",
        href: "/owner",
        icon: Settings,
        ready: true,
      },
    ],
  },
];
