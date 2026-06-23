"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  GlassWater,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wine,
  X,
} from "lucide-react";
import { useOrders } from "@/components/orders/orders-context";
import { useAuth } from "@/components/auth/auth-context";
import {
  menuApi,
  cantinaApi,
  type MenuItem,
  type DailyDish,
  type OrderArea,
  type WineCellarItem,
} from "@/lib/api-client";
import type { SalaTable } from "./types";
import type { CourseDraft } from "@/components/orders/types";
import { cn } from "@/lib/utils";

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
type SpeechRecognitionResultList = { [index: number]: { [index: number]: { transcript: string }; isFinal: boolean }; length: number };
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

type Props = {
  table: SalaTable | null;
  open: boolean;
  onClose: () => void;
};

type MenuType = "casa" | "giorno" | "bevande" | "vini";

const MENU_TYPES: { id: MenuType; label: string; icon: typeof BookOpen }[] = [
  { id: "casa", label: "Menu della Casa", icon: BookOpen },
  { id: "giorno", label: "Menu del Giorno", icon: CalendarDays },
  { id: "bevande", label: "Menu Bevande", icon: GlassWater },
  { id: "vini", label: "Menu Vini", icon: Wine },
];

const FOOD_CATEGORIES = ["Antipasti", "Primi", "Secondi", "Pizze", "Contorni", "Dolci"];
const DRINK_CATEGORIES = ["Bibite Analcoliche", "Acqua", "Birre", "Cocktail", "Bevande"];

const VALID_AREAS: OrderArea[] = ["sala", "cucina", "bar", "pizzeria"];

function normalizeArea(raw: string): OrderArea {
  const lower = (raw || "").toLowerCase();
  return (VALID_AREAS as string[]).includes(lower) ? (lower as OrderArea) : "cucina";
}

export function OrderSendModal({ table, open, onClose }: Props) {
  const { createOrder, appendToOrder, getOrdersForTable } = useOrders();
  const { user } = useAuth();

  const [courses, setCourses] = useState<CourseDraft[]>([{ n: 1, items: [] }]);
  const [activeCourse, setActiveCourse] = useState(1);
  const [covers, setCovers] = useState(2);
  const [waiter, setWaiter] = useState(user?.name || user?.username || "");
  const [notes, setNotes] = useState("");

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dailyDishes, setDailyDishes] = useState<DailyDish[]>([]);
  const [wines, setWines] = useState<WineCellarItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [activeMenuType, setActiveMenuType] = useState<MenuType | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [editingNote, setEditingNote] = useState<{ courseN: number; name: string } | null>(null);

  // Voice ordering
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceParsing, setVoiceParsing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const W = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "it-IT";
    recognitionRef.current = rec;
  }, []);

  const existingOrder = useMemo(() => {
    if (!table) return null;
    const orders = getOrdersForTable(table.nome);
    return orders.length > 0 ? orders[0] : null;
  }, [table, getOrdersForTable]);

  useEffect(() => {
    if (!open) return;
    setLoadingMenu(true);
    Promise.all([
      menuApi.listItems(),
      menuApi.listDaily().catch(() => [] as DailyDish[]),
      cantinaApi.list().catch(() => [] as WineCellarItem[]),
    ])
      .then(([items, daily, wineItems]) => {
        setMenuItems(items.filter((item) => item.active !== false));
        setDailyDishes(daily);
        setWines(wineItems.filter((w) => w.stock > 0));
        setMenuError(null);
      })
      .catch((err) => setMenuError((err as Error).message || "Errore caricamento menu"))
      .finally(() => setLoadingMenu(false));
  }, [open]);

  useEffect(() => {
    if (user && !waiter) setWaiter(user.name || user.username || "");
  }, [user, waiter]);

  useEffect(() => {
    if (!open) {
      setActiveMenuType(null);
      setActiveCategory(null);
      setEditingNote(null);
      setVoiceTranscript("");
      setVoiceError(null);
      setSendError(null);
    }
  }, [open]);

  const casaByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const cat = item.category || "Altro";
      const area = (item.area || "").toLowerCase();
      if (area === "bar") continue;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [menuItems]);

  const beveragesByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const area = (item.area || "").toLowerCase();
      if (area !== "bar") continue;
      const cat = item.category || "Bevande";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return map;
  }, [menuItems]);

  const dailyByCategory = useMemo(() => {
    const map = new Map<string, DailyDish[]>();
    for (const dish of dailyDishes) {
      const cat = dish.category || "Altro";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(dish);
    }
    return map;
  }, [dailyDishes]);

  const categoriesForMenuType = useCallback(
    (type: MenuType): string[] => {
      switch (type) {
        case "casa": {
          const dynamic = Array.from(casaByCategory.keys());
          const ordered = FOOD_CATEGORIES.filter((c) => dynamic.includes(c));
          const extra = dynamic.filter((c) => !FOOD_CATEGORIES.includes(c));
          return [...ordered, ...extra];
        }
        case "giorno": {
          const dynamic = Array.from(dailyByCategory.keys());
          const ordered = FOOD_CATEGORIES.filter((c) => dynamic.includes(c));
          const extra = dynamic.filter((c) => !FOOD_CATEGORIES.includes(c));
          return [...ordered, ...extra];
        }
        case "bevande": {
          const dynamic = Array.from(beveragesByCategory.keys());
          const ordered = DRINK_CATEGORIES.filter((c) => dynamic.includes(c));
          const extra = dynamic.filter((c) => !DRINK_CATEGORIES.includes(c));
          return [...ordered, ...extra];
        }
        case "vini": {
          const regions = new Set(wines.map((w) => w.region || "Altro"));
          return Array.from(regions).sort();
        }
      }
    },
    [casaByCategory, dailyByCategory, beveragesByCategory, wines],
  );

  const itemsForCategorySelection = useMemo((): { id: string; name: string; price: number; area: string; category: string; subtitle?: string }[] => {
    if (!activeMenuType || !activeCategory) return [];
    switch (activeMenuType) {
      case "casa":
        return (casaByCategory.get(activeCategory) ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          area: i.area,
          category: i.category,
        }));
      case "giorno":
        return (dailyByCategory.get(activeCategory) ?? []).map((d) => ({
          id: `daily-${d.id}`,
          name: d.name,
          price: d.price,
          area: "cucina",
          category: d.category,
          subtitle: d.description || undefined,
        }));
      case "bevande":
        return (beveragesByCategory.get(activeCategory) ?? []).map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          area: i.area,
          category: i.category,
        }));
      case "vini":
        return wines
          .filter((w) => (w.region || "Altro") === activeCategory)
          .map((w) => ({
            id: `wine-${w.id}`,
            name: `${w.name}${w.vintageYear ? ` ${w.vintageYear}` : ""}`,
            price: w.sellingPrice,
            area: "bar",
            category: "Cantina",
            subtitle: w.producer ? `${w.producer}${w.region ? ` · ${w.region}` : ""}` : undefined,
          }));
    }
  }, [activeMenuType, activeCategory, casaByCategory, dailyByCategory, beveragesByCategory, wines]);

  function startVoiceOrder() {
    const rec = recognitionRef.current;
    if (!rec) { setVoiceError("Riconoscimento vocale non supportato dal browser."); return; }
    setVoiceTranscript("");
    setVoiceError(null);
    setVoiceListening(true);

    let finalTranscript = "";

    rec.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setVoiceTranscript(finalTranscript + interim);
    };

    rec.onend = () => {
      setVoiceListening(false);
      if (finalTranscript.trim()) {
        void parseVoiceTranscript(finalTranscript.trim());
      }
    };

    rec.onerror = (event: { error: string }) => {
      setVoiceListening(false);
      if (event.error !== "aborted") setVoiceError(`Errore vocale: ${event.error}`);
    };

    rec.start();
  }

  function stopVoiceOrder() {
    recognitionRef.current?.stop();
    setVoiceListening(false);
  }

  async function parseVoiceTranscript(text: string) {
    setVoiceParsing(true);
    setVoiceError(null);
    try {
      const res = await fetch("/api/ai/parse-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok) { setVoiceError(data.error || "Errore parsing AI"); return; }

      const items = data.items as Array<{
        name: string; qty: number; course: number; category: string;
        area: "cucina" | "bar" | "pizzeria";
        matchedMenuItemId: string | null; matchedPrice: number | null;
      }>;

      if (!items || items.length === 0) { setVoiceError("Nessun piatto riconosciuto. Riprova."); return; }

      const maxCourse = Math.max(...items.map((i) => i.course));
      setCourses((prev) => {
        let updated = [...prev];
        while (updated.length < maxCourse) {
          updated.push({ n: updated.length + 1, items: [] });
        }
        for (const item of items) {
          const courseIdx = item.course - 1;
          const existing = updated[courseIdx].items.find((i) => i.name === item.name);
          if (existing) {
            updated = updated.map((c, ci) =>
              ci === courseIdx ? { ...c, items: c.items.map((i) => (i.name === item.name ? { ...i, qty: i.qty + item.qty } : i)) } : c,
            );
          } else {
            updated = updated.map((c, ci) =>
              ci === courseIdx
                ? { ...c, items: [...c.items, { name: item.name, qty: item.qty, category: item.category, area: item.area, price: item.matchedPrice, note: null }] }
                : c,
            );
          }
        }
        return updated;
      });
      setActiveCourse(1);
      setActiveMenuType(null);
      setActiveCategory(null);
    } catch (e) {
      setVoiceError(e instanceof Error ? e.message : "Errore connessione AI");
    } finally {
      setVoiceParsing(false);
    }
  }

  if (!table || !open) return null;

  function addItem(item: { id: string; name: string; price: number; area: string; category: string }) {
    const area = normalizeArea(item.area);
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== activeCourse) return c;
        const existing = c.items.find((i) => i.name === item.name);
        if (existing) {
          return { ...c, items: c.items.map((i) => (i.name === item.name ? { ...i, qty: i.qty + 1 } : i)) };
        }
        return {
          ...c,
          items: [...c.items, { name: item.name, qty: 1, category: item.category, area, price: item.price, note: null }],
        };
      }),
    );
  }

  function removeItem(courseN: number, name: string) {
    setCourses((prev) => prev.map((c) => (c.n === courseN ? { ...c, items: c.items.filter((i) => i.name !== name) } : c)));
  }

  function updateQty(courseN: number, name: string, delta: number) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== courseN) return c;
        return { ...c, items: c.items.map((i) => (i.name === name ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0) };
      }),
    );
  }

  function updateNote(courseN: number, name: string, note: string) {
    setCourses((prev) =>
      prev.map((c) =>
        c.n === courseN
          ? { ...c, items: c.items.map((i) => (i.name === name ? { ...i, note: note || null } : i)) }
          : c,
      ),
    );
  }

  function addCourse() {
    const next = courses.length + 1;
    setCourses((p) => [...p, { n: next, items: [] }]);
    setActiveCourse(next);
  }

  async function handleSend() {
    const allOrderItems = courses.flatMap((c) =>
      c.items.map((it, idx) => ({
        id: `new-${c.n}-${idx}`,
        name: it.name,
        qty: it.qty,
        category: it.category,
        area: it.area,
        price: it.price,
        note: it.note,
        course: c.n,
        menuItemId: null,
      })),
    );
    if (allOrderItems.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      if (existingOrder) {
        await appendToOrder(existingOrder.id, allOrderItems, notes || undefined);
      } else {
        await createOrder({ table: table!.nome, covers, area: "sala", waiter: waiter || "—", notes, items: allOrderItems });
      }
      setCourses([{ n: 1, items: [] }]);
      setActiveCourse(1);
      setNotes("");
      setActiveMenuType(null);
      setActiveCategory(null);
      onClose();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Errore invio ordine");
    } finally {
      setSending(false);
    }
  }

  const totalItems = courses.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0), 0);
  const totalPrice = courses.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.qty * (i.price ?? 0), 0), 0);

  const showCategoryPanel = activeMenuType !== null;
  const showItemsPanel = activeCategory !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[min(95dvh,960px)] w-full max-w-5xl flex-col rounded-t-[1.75rem] border border-rw-line bg-rw-surface shadow-rw sm:max-h-[90dvh] sm:rounded-3xl"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rw-line px-5 pb-3 pt-4 sm:px-6">
          <div className="flex items-center gap-3">
            {(showCategoryPanel || showItemsPanel) && (
              <button
                type="button"
                onClick={() => {
                  if (showItemsPanel) setActiveCategory(null);
                  else { setActiveMenuType(null); setActiveCategory(null); }
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="font-display text-lg font-semibold text-rw-ink">
                {existingOrder ? `Aggiungi a ${table.nome}` : `Ordine ${table.nome}`}
              </h2>
              <p className="text-xs text-rw-muted">
                {activeMenuType && activeCategory
                  ? `${MENU_TYPES.find((m) => m.id === activeMenuType)?.label} › ${activeCategory}`
                  : activeMenuType
                    ? MENU_TYPES.find((m) => m.id === activeMenuType)?.label
                    : "Scegli il menu"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={voiceListening ? stopVoiceOrder : startVoiceOrder}
              disabled={voiceParsing}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
                voiceListening
                  ? "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse"
                  : voiceParsing
                    ? "border-rw-accent/30 bg-rw-accent/10 text-rw-accent"
                    : "border-rw-line bg-rw-surfaceAlt text-rw-soft hover:text-rw-ink hover:border-rw-accent/30",
              )}
              title={voiceListening ? "Stop" : "Ordine vocale AI"}
            >
              {voiceParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              <span className="hidden sm:inline">{voiceParsing ? "Elaboro..." : voiceListening ? "Stop" : "Voce AI"}</span>
            </button>
            {totalItems > 0 && (
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-300">
                {totalItems} piatti · €{totalPrice.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
              aria-label="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left column: order summary */}
          <aside className="hidden w-64 shrink-0 flex-col border-r border-rw-line sm:flex overflow-y-auto">
            <div className="p-4 space-y-3">
              {!existingOrder && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-rw-muted">Coperti</span>
                    <div className="mt-1 flex items-center gap-1">
                      <button type="button" onClick={() => setCovers((n) => Math.max(1, n - 1))} className="h-8 w-8 rounded-lg border border-rw-line bg-rw-surfaceAlt text-rw-ink text-xs"><Minus className="mx-auto h-3.5 w-3.5" /></button>
                      <span className="w-6 text-center font-bold text-rw-ink text-sm">{covers}</span>
                      <button type="button" onClick={() => setCovers((n) => n + 1)} className="h-8 w-8 rounded-lg border border-rw-line bg-rw-surfaceAlt text-rw-ink text-xs"><Plus className="mx-auto h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-rw-muted">Cameriere</span>
                    <input value={waiter} onChange={(e) => setWaiter(e.target.value)} className="mt-1 h-8 w-full rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 text-xs text-rw-ink" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1">
                {courses.map((c) => (
                  <button
                    key={c.n}
                    type="button"
                    onClick={() => setActiveCourse(c.n)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
                      activeCourse === c.n ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-rw-surfaceAlt text-rw-muted border border-rw-line",
                    )}
                  >
                    Corso {c.n}
                    {c.items.length > 0 && <span className="ml-0.5 opacity-70">({c.items.length})</span>}
                  </button>
                ))}
                <button type="button" onClick={addCourse} className="rounded-lg border border-dashed border-rw-line px-2 py-1.5 text-xs text-rw-muted hover:text-rw-accent" title="Aggiungi un nuovo corso">
                  <Plus className="inline h-3 w-3 mr-0.5" /> Corso
                </button>
              </div>

              {courses.map((c) => {
                if (c.items.length === 0) return null;
                return (
                  <div key={c.n} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-2">
                    <p className={cn("text-[10px] font-bold uppercase tracking-wide mb-1", c.n === activeCourse ? "text-emerald-400" : "text-rw-muted")}>
                      Corso {c.n}
                    </p>
                    <div className="space-y-0.5">
                      {c.items.map((it) => {
                        const isEditingThis = editingNote?.courseN === c.n && editingNote?.name === it.name;
                        return (
                          <div key={it.name} className="rounded-lg bg-rw-surface px-2 py-1.5">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-semibold text-rw-ink">{it.name}</span>
                                <span className="text-[10px] text-rw-muted">€{(it.price ?? 0).toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button type="button" onClick={() => updateQty(c.n, it.name, -1)} className="h-6 w-6 rounded border border-rw-line text-rw-ink text-[10px]">−</button>
                                <span className="w-5 text-center text-xs font-bold text-rw-ink">{it.qty}</span>
                                <button type="button" onClick={() => updateQty(c.n, it.name, 1)} className="h-6 w-6 rounded border border-rw-line text-rw-ink text-[10px]">+</button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNote(isEditingThis ? null : { courseN: c.n, name: it.name })}
                                  className={cn(
                                    "ml-0.5 h-6 w-6 rounded border text-[10px]",
                                    it.note
                                      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                      : "border-rw-line text-rw-muted hover:text-rw-accent",
                                  )}
                                  title="Modifica (senza cipolla, ben cotta…)"
                                >
                                  <Pencil className="mx-auto h-3 w-3" />
                                </button>
                                <button type="button" onClick={() => removeItem(c.n, it.name)} className="ml-0.5 h-6 w-6 rounded border border-red-500/30 text-red-400 text-[10px]">
                                  <Trash2 className="mx-auto h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            {it.note && !isEditingThis && (
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] italic text-amber-400">
                                <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                                {it.note}
                              </p>
                            )}
                            {isEditingThis && (
                              <div className="mt-1.5 flex gap-1">
                                <input
                                  autoFocus
                                  placeholder="es. senza cipolla, ben cotta, extra mozzarella..."
                                  defaultValue={it.note ?? ""}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      updateNote(c.n, it.name, (e.target as HTMLInputElement).value);
                                      setEditingNote(null);
                                    }
                                    if (e.key === "Escape") setEditingNote(null);
                                  }}
                                  onBlur={(e) => {
                                    updateNote(c.n, it.name, e.target.value);
                                    setEditingNote(null);
                                  }}
                                  className="h-6 flex-1 rounded border border-amber-500/30 bg-rw-surfaceAlt px-1.5 text-[10px] text-rw-ink placeholder:text-rw-muted focus:border-amber-400 focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note ordine..."
                rows={2}
                className="w-full rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-xs text-rw-ink placeholder:text-rw-muted"
              />
            </div>
          </aside>

          {/* Main panel: menu navigation */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {loadingMenu && (
              <div className="flex flex-1 items-center justify-center gap-2 text-sm text-rw-muted">
                <Loader2 className="h-5 w-5 animate-spin" /> Caricamento menu…
              </div>
            )}
            {menuError && !loadingMenu && (
              <div className="m-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{menuError}</div>
            )}

            {(voiceListening || voiceTranscript || voiceError) && (
              <div className="mx-4 mt-3 rounded-xl border border-rw-accent/30 bg-rw-accent/5 p-4">
                {voiceListening && (
                  <div className="flex items-center gap-2 text-sm text-rw-accent">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                    </span>
                    Ascoltando… detta l&apos;ordine. Di &quot;SEGUE&quot; per cambiare portata.
                  </div>
                )}
                {voiceTranscript && (
                  <p className="mt-2 rounded-lg bg-rw-surfaceAlt p-3 text-sm italic text-rw-ink">
                    &ldquo;{voiceTranscript}&rdquo;
                  </p>
                )}
                {voiceParsing && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-rw-muted">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Risto sta elaborando l&apos;ordine…
                  </div>
                )}
                {voiceError && (
                  <p className="mt-2 text-sm text-red-400">{voiceError}</p>
                )}
                {voiceTranscript && !voiceListening && !voiceParsing && (
                  <button
                    type="button"
                    onClick={() => void parseVoiceTranscript(voiceTranscript)}
                    className="mt-2 rounded-lg border border-rw-accent/30 bg-rw-accent/10 px-3 py-1.5 text-xs font-semibold text-rw-accent"
                  >
                    Rielabora trascritto
                  </button>
                )}
              </div>
            )}

            {/* Level 0: Choose menu type */}
            {!loadingMenu && !menuError && !showCategoryPanel && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-rw-muted">Quale menu?</p>
                <div className="grid w-full max-w-md grid-cols-2 gap-3">
                  {MENU_TYPES.map((mt) => {
                    const Icon = mt.icon;
                    const count = categoriesForMenuType(mt.id).length;
                    return (
                      <button
                        key={mt.id}
                        type="button"
                        disabled={count === 0}
                        onClick={() => { setActiveMenuType(mt.id); setActiveCategory(null); }}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-2xl border p-6 text-center transition active:scale-[0.98]",
                          count > 0
                            ? "border-rw-line bg-rw-surfaceAlt text-rw-ink hover:border-rw-accent/40 hover:bg-rw-accent/10"
                            : "border-rw-line/50 bg-rw-surfaceAlt/50 text-rw-muted cursor-not-allowed opacity-50",
                        )}
                      >
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-accent/15">
                          <Icon className="h-7 w-7 text-rw-accent" />
                        </span>
                        <span className="text-sm font-semibold">{mt.label}</span>
                        {count > 0 && <span className="text-[10px] text-rw-muted">{count} categorie</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Level 1: Choose category */}
            {!loadingMenu && !menuError && showCategoryPanel && !showItemsPanel && activeMenuType && (
              <div className="flex flex-1 flex-col p-4 overflow-y-auto">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rw-muted">Categoria</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categoriesForMenuType(activeMenuType).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className="rounded-2xl border border-rw-line bg-rw-surfaceAlt px-4 py-5 text-center text-sm font-semibold text-rw-ink transition hover:border-rw-accent/40 hover:bg-rw-accent/10 active:scale-[0.98]"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Level 2: Items grid */}
            {!loadingMenu && !menuError && showItemsPanel && (
              <div className="flex flex-1 flex-col p-4 overflow-y-auto">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rw-muted">
                  {activeCategory} — tocca per aggiungere al Corso {activeCourse}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {itemsForCategorySelection.map((item) => {
                    const inOrder = courses
                      .flatMap((c) => c.items)
                      .find((i) => i.name === item.name);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => addItem(item)}
                        className={cn(
                          "relative rounded-xl border px-3 py-3 text-left transition active:scale-[0.97]",
                          inOrder
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-rw-line bg-rw-surfaceAlt hover:border-rw-accent/30",
                        )}
                      >
                        <span className="block text-sm font-semibold text-rw-ink">{item.name}</span>
                        {item.subtitle && (
                          <span className="block truncate text-[10px] text-rw-muted">{item.subtitle}</span>
                        )}
                        <span className="mt-1 block text-xs text-rw-muted">€{item.price.toFixed(2)}</span>
                        {inOrder && (
                          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                            {inOrder.qty}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {itemsForCategorySelection.length === 0 && (
                    <p className="col-span-full py-10 text-center text-sm text-rw-muted">
                      Nessun piatto in questa categoria.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Mobile-only: order summary (collapsed at bottom) */}
            <div className="border-t border-rw-line p-3 sm:hidden">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-rw-muted">
                  <span>Riepilogo ordine ({totalItems} piatti)</span>
                  <span className="text-rw-ink">€{totalPrice.toFixed(2)}</span>
                </summary>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {courses.flatMap((c) =>
                    c.items.map((it) => {
                      const isEditingMobile = editingNote?.courseN === c.n && editingNote?.name === it.name;
                      return (
                        <div key={`${c.n}-${it.name}`} className="rounded-lg bg-rw-surfaceAlt px-2 py-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="text-rw-ink">{it.qty}x {it.name}</span>
                              {it.note && !isEditingMobile && (
                                <span className="ml-1 text-[10px] italic text-amber-400">({it.note})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button type="button" onClick={() => updateQty(c.n, it.name, -1)} className="h-5 w-5 rounded border border-rw-line text-rw-ink text-[10px]">−</button>
                              <button type="button" onClick={() => updateQty(c.n, it.name, 1)} className="h-5 w-5 rounded border border-rw-line text-rw-ink text-[10px]">+</button>
                              <button
                                type="button"
                                onClick={() => setEditingNote(isEditingMobile ? null : { courseN: c.n, name: it.name })}
                                className={cn(
                                  "h-5 w-5 rounded border text-[10px]",
                                  it.note ? "border-amber-500/40 text-amber-400" : "border-rw-line text-rw-muted",
                                )}
                              >
                                <Pencil className="mx-auto h-2.5 w-2.5" />
                              </button>
                              <span className="text-rw-muted">€{((it.price ?? 0) * it.qty).toFixed(2)}</span>
                              <button type="button" onClick={() => removeItem(c.n, it.name)} className="text-red-400"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                          {isEditingMobile && (
                            <input
                              autoFocus
                              placeholder="es. senza cipolla, ben cotta..."
                              defaultValue={it.note ?? ""}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateNote(c.n, it.name, (e.target as HTMLInputElement).value);
                                  setEditingNote(null);
                                }
                                if (e.key === "Escape") setEditingNote(null);
                              }}
                              onBlur={(e) => {
                                updateNote(c.n, it.name, e.target.value);
                                setEditingNote(null);
                              }}
                              className="mt-1 h-6 w-full rounded border border-amber-500/30 bg-rw-surface px-2 text-[10px] text-rw-ink placeholder:text-rw-muted focus:border-amber-400 focus:outline-none"
                            />
                          )}
                        </div>
                      );
                    }),
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Footer: send */}
        <footer className="shrink-0 border-t border-rw-line px-5 py-3 sm:px-6">
          {sendError && (
            <div className="mb-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{sendError}</div>
          )}
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={totalItems === 0 || sending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 py-3.5 text-base font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            {sending
              ? "Invio..."
              : existingOrder
                ? `Aggiungi ${totalItems} piatti`
                : `Invia ordine (${totalItems} piatti · €${totalPrice.toFixed(2)})`}
          </button>
        </footer>
      </div>
    </div>
  );
}
