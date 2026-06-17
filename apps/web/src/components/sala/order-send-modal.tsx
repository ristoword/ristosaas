"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Plus, Search, Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/shared/modal";
import { useOrders } from "@/components/orders/orders-context";
import { useAuth } from "@/components/auth/auth-context";
import { menuApi, type MenuItem, type OrderArea } from "@/lib/api-client";
import type { SalaTable } from "./types";
import type { CourseDraft } from "@/components/orders/types";
import { useI18n } from "@/core/i18n/provider";

type Props = {
  table: SalaTable | null;
  open: boolean;
  onClose: () => void;
};

const VALID_AREAS: OrderArea[] = ["sala", "cucina", "bar", "pizzeria"];

const AREA_BADGE: Record<string, string> = {
  cucina: "bg-orange-500/15 text-orange-400",
  pizzeria: "bg-yellow-500/15 text-yellow-400",
  bar: "bg-sky-500/15 text-sky-400",
  sala: "bg-rw-surfaceAlt text-rw-muted",
};

function normalizeArea(raw: string): OrderArea {
  const lower = (raw || "").toLowerCase();
  return (VALID_AREAS as string[]).includes(lower) ? (lower as OrderArea) : "cucina";
}

export function OrderSendModal({ table, open, onClose }: Props) {
  const { t } = useI18n();
  const { createOrder, appendToOrder, getOrdersForTable } = useOrders();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseDraft[]>([{ n: 1, items: [] }]);
  const [activeCourse, setActiveCourse] = useState(1);
  const [covers, setCovers] = useState(2);
  const [waiter, setWaiter] = useState<string>(user?.name || user?.username || "");
  const [notes, setNotes] = useState("");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const existingOrder = useMemo(() => {
    if (!table) return null;
    const orders = getOrdersForTable(table.nome);
    return orders.length > 0 ? orders[0] : null;
  }, [table, getOrdersForTable]);

  useEffect(() => {
    if (!open) return;
    setLoadingMenu(true);
    menuApi
      .listItems()
      .then((items) => {
        setMenu(items.filter((item) => item.active !== false));
        setMenuError(null);
      })
      .catch((err) => setMenuError((err as Error).message || t("sala.modal.order.menuLoadError")))
      .finally(() => setLoadingMenu(false));
  }, [open, t]);

  useEffect(() => {
    if (user && !waiter) setWaiter(user.name || user.username || "");
  }, [user, waiter]);

  const categories = useMemo(() => {
    const all = new Set(menu.map((item) => item.category).filter(Boolean));
    return ["all", ...Array.from(all)];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((item) => {
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      const itemArea = (item.area || "cucina").toLowerCase();
      const matchArea = areaFilter === "all" || itemArea === areaFilter;
      const matchSearch = q === "" || item.name.toLowerCase().includes(q);
      return matchCategory && matchArea && matchSearch;
    });
  }, [menu, search, categoryFilter, areaFilter]);

  if (!table) return null;

  function addCourse() {
    const next = courses.length + 1;
    setCourses((p) => [...p, { n: next, items: [] }]);
    setActiveCourse(next);
  }

  function addItem(item: MenuItem) {
    const area = normalizeArea(item.area);
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== activeCourse) return c;
        const existing = c.items.find((i) => i.name === item.name);
        if (existing) {
          return {
            ...c,
            items: c.items.map((i) =>
              i.name === item.name ? { ...i, qty: i.qty + 1 } : i,
            ),
          };
        }
        return {
          ...c,
          items: [
            ...c.items,
            {
              name: item.name,
              qty: 1,
              category: item.category,
              area,
              price: item.price,
              note: null,
            },
          ],
        };
      }),
    );
  }

  function removeItem(courseN: number, name: string) {
    setCourses((prev) =>
      prev.map((c) =>
        c.n === courseN ? { ...c, items: c.items.filter((i) => i.name !== name) } : c,
      ),
    );
  }

  function updateQty(courseN: number, name: string, delta: number) {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.n !== courseN) return c;
        return {
          ...c,
          items: c.items
            .map((i) => (i.name === name ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
            .filter((i) => i.qty > 0),
        };
      }),
    );
  }

  async function handleSend() {
    const allItems = courses.flatMap((c) =>
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
    if (allItems.length === 0) return;

    setSending(true);
    setSendError(null);
    try {
      if (existingOrder) {
        await appendToOrder(existingOrder.id, allItems, notes || undefined);
      } else {
        await createOrder({
          table: table!.nome,
          covers,
          area: "sala",
          waiter: waiter || "—",
          notes,
          items: allItems,
        });
      }
      setCourses([{ n: 1, items: [] }]);
      setActiveCourse(1);
      setNotes("");
      onClose();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : t("sala.modal.order.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  const totalItems = courses.reduce(
    (sum, c) => sum + c.items.reduce((s, i) => s + i.qty, 0),
    0,
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        existingOrder
          ? t("sala.modal.order.titleAppend").replace("{name}", table.nome)
          : t("sala.modal.order.title").replace("{name}", table.nome)
      }
      subtitle={
        existingOrder
          ? t("sala.modal.order.subtitleAppend").replace(
              "{n}",
              String(existingOrder.items.length),
            )
          : t("sala.modal.order.subtitle")
              .replace("{covers}", String(covers))
              .replace("{waiter}", waiter || "—")
      }
      wide
    >
      <div className="space-y-4">
        {existingOrder && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-rw-ink">
            <p className="font-semibold text-emerald-400">{t("sala.modal.order.existingBanner")}</p>
            <p className="mt-1 text-xs text-rw-muted">
              {t("sala.modal.order.existingInfo")
                .replace("{n}", String(existingOrder.items.length))
                .replace("{courses}", String([...new Set(existingOrder.items.map((i) => i.course))].length))}
            </p>
          </div>
        )}

        {!existingOrder && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-rw-muted">{t("sala.modal.order.covers")}</label>
              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCovers((n) => Math.max(1, n - 1))}
                  className="h-10 w-10 rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
                >
                  <Minus className="mx-auto h-4 w-4" />
                </button>
                <span className="w-8 text-center font-bold text-rw-ink">{covers}</span>
                <button
                  type="button"
                  onClick={() => setCovers((n) => n + 1)}
                  className="h-10 w-10 rounded-xl border border-rw-line bg-rw-surfaceAlt text-rw-ink"
                >
                  <Plus className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-rw-muted">{t("sala.modal.order.waiter")}</label>
              <input
                value={waiter}
                onChange={(e) => setWaiter(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 text-sm text-rw-ink"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {courses.map((c) => (
            <button
              key={c.n}
              type="button"
              onClick={() => setActiveCourse(c.n)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                activeCourse === c.n
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-red-500/10 text-red-400 border border-red-500/30"
              }`}
            >
              {t("sala.course.label").replace("{n}", String(c.n))}
              {c.items.length > 0 && <span className="ml-1 opacity-70">({c.items.length})</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={addCourse}
            className="rounded-xl border border-dashed border-rw-line px-3 py-2 text-sm text-rw-muted hover:border-rw-accent/40 hover:text-rw-accent"
          >
            <Plus className="inline h-4 w-4 mr-1" />
            {t("sala.modal.order.addCourse")}
          </button>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-rw-muted">
              {t("sala.modal.order.addToCourse")
                .replace("{n}", String(activeCourse))
                .replace("{items}", String(menu.length))}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-rw-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("sala.modal.order.searchPlaceholder")}
                  className="h-8 rounded-lg border border-rw-line bg-rw-surfaceAlt pl-7 pr-2 text-xs text-rw-ink"
                />
              </div>
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="h-8 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 text-xs text-rw-ink"
              >
                <option value="all">{t("sala.modal.order.allAreas")}</option>
                <option value="cucina">🍳 {t("sala.modal.dest.cucina")}</option>
                <option value="pizzeria">🍕 {t("sala.modal.dest.pizzeria")}</option>
                <option value="bar">🍹 {t("sala.modal.dest.bar")}</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border border-rw-line bg-rw-surfaceAlt px-2 text-xs text-rw-ink"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? t("sala.modal.order.allCategories") : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingMenu && (
            <div className="flex items-center gap-2 rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-4 text-sm text-rw-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("sala.modal.order.loadingMenu")}
            </div>
          )}
          {menuError && !loadingMenu && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {menuError}
            </div>
          )}
          {!loadingMenu && !menuError && (
            <div className="grid max-h-48 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3">
              {filteredMenu.map((item) => {
                const itemArea = (item.area || "cucina").toLowerCase();
                const badgeCls = AREA_BADGE[itemArea] ?? AREA_BADGE.sala;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => addItem(item)}
                    className="rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-left text-xs transition hover:border-rw-accent/30"
                  >
                    <span className="block font-semibold text-rw-ink">{item.name}</span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="text-rw-muted">€{item.price.toFixed(2)}</span>
                      <span className={`rounded px-1 py-0.5 text-[10px] font-bold ${badgeCls}`}>
                        {itemArea}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredMenu.length === 0 && (
                <p className="col-span-full py-6 text-center text-sm text-rw-muted">
                  {t("sala.modal.order.noMenuItems")}
                </p>
              )}
            </div>
          )}
        </div>

        {courses.map((c) => {
          if (c.items.length === 0) return null;
          return (
            <div key={c.n} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
              <p
                className={`text-xs font-bold uppercase tracking-wide mb-2 ${
                  c.n === 1 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {t("sala.course.label").replace("{n}", String(c.n))} — {c.n === 1 ? t("sala.course.active") : t("sala.course.waiting")}
              </p>
              <div className="space-y-1">
                {c.items.map((it) => (
                  <div
                    key={it.name}
                    className="flex items-center justify-between rounded-lg bg-rw-surface px-3 py-2"
                  >
                    <div>
                      <span className="text-sm font-semibold text-rw-ink">{it.name}</span>
                      <span className="ml-2 text-xs text-rw-muted">
                        €{(it.price ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateQty(c.n, it.name, -1)}
                        className="h-7 w-7 rounded-lg border border-rw-line text-rw-ink text-xs"
                      >
                        −
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-rw-ink">{it.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.n, it.name, 1)}
                        className="h-7 w-7 rounded-lg border border-rw-line text-rw-ink text-xs"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(c.n, it.name)}
                        className="ml-1 h-7 w-7 rounded-lg border border-red-500/30 text-red-400 text-xs"
                      >
                        <Trash2 className="mx-auto h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("sala.modal.order.notesPlaceholder")}
          rows={2}
          className="w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-ink placeholder:text-rw-muted"
        />

        {sendError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {sendError}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={totalItems === 0 || sending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 py-4 text-base font-bold text-emerald-300 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          {sending
            ? t("sala.modal.order.sending")
            : existingOrder
              ? t("sala.modal.order.sendAppend")
              : t("sala.modal.order.send")}{" "}
          ({totalItems} {t("sala.modal.order.dishes")}, {courses.length}{" "}
          {courses.length === 1 ? t("sala.modal.order.courseSingular") : t("sala.modal.order.coursePlural")})
        </button>
      </div>
    </Modal>
  );
}
