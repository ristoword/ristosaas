"use client";

import { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/core/i18n/provider";
import type { Order, MenuItem as ApiMenuItem } from "@/lib/api-client";
import { CassaTableGrid } from "./table-grid";
import { CassaBillDetail } from "./bill-detail";
import { CassaQuickMenu } from "./quick-menu";
import { CassaActionSidebar } from "./action-sidebar";
import { CassaPayButton } from "./pay-button";
import { FAB_CLEARANCE } from "./styles";

type MobilePanel = "tables" | "bill" | "menu" | "actions";

type Props = {
  servedOrders: Order[];
  menuItems: ApiMenuItem[];
  onCloseTable: (
    orderIds: string[],
    opts?: { discount?: number; vatRate?: number; paymentMethod?: string },
  ) => Promise<{ total: number; fiscalInvoice: { progressiveNumber: number; sdiStatus: string } | null } | null>;
};

function panelVisibility(active: MobilePanel, panel: MobilePanel) {
  return cn(active !== panel && "hidden lg:block");
}

export function CassaEnterpriseWorkspace({ servedOrders, menuItems, onCloseTable }: Props) {
  const { t } = useI18n();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [discount, setDiscount] = useState("");
  const [vatOverride, setVatOverride] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("tables");

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of servedOrders) {
      const key = o.table ?? "asporto";
      const arr = map.get(key) ?? [];
      arr.push(o);
      map.set(key, arr);
    }
    return map;
  }, [servedOrders]);

  const tableOrders = useMemo(
    () => (selectedTable ? (grouped.get(selectedTable) ?? []) : []),
    [grouped, selectedTable],
  );
  const selected = tableOrders.length > 0 ? tableOrders[0] : null;
  const allItems = tableOrders.flatMap((o) => o.items);

  const subtotal = allItems.reduce((s, i) => s + (i.price ?? 0) * i.qty, 0);
  const discountVal = parseFloat(discount) || 0;
  const vatVal = parseFloat(vatOverride) || 10;
  const afterDiscount = subtotal - discountVal;
  const total = afterDiscount * (1 + vatVal / 100);

  const doFlash = useCallback((msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }, []);

  const handleCloseTable = useCallback(async () => {
    const ids = tableOrders.map((o) => o.id);
    if (!ids.length) return;
    try {
      const result = await onCloseTable(ids, {
        discount: discountVal,
        vatRate: vatVal,
        paymentMethod: "contanti",
      });
      setSelectedTable(null);
      const fiscalNote =
        result?.fiscalInvoice != null
          ? ` — Fattura #${result.fiscalInvoice.progressiveNumber} (${result.fiscalInvoice.sdiStatus})`
          : "";
      doFlash(`${t("cassa.closeTable.flash")} €${(result?.total ?? total).toFixed(2)}${fiscalNote}`);
    } catch {
      doFlash(t("cassa.closeTable.error"));
    }
  }, [tableOrders, onCloseTable, discountVal, vatVal, total, doFlash, t]);

  const handlePay = useCallback(() => {
    if (!selected) {
      doFlash(t("cassa.noTableSelected"));
      return;
    }
    handleCloseTable();
  }, [selected, doFlash, t, handleCloseTable]);

  const mobilePanels: { id: MobilePanel; label: string }[] = [
    { id: "tables", label: t("cassa.tab.tables") },
    { id: "bill", label: t("ui.bill") },
    { id: "menu", label: t("cassa.tab.menuShort") },
    { id: "actions", label: t("cassa.enterprise.actionsShort") },
  ];

  return (
    <div className={cn("relative", FAB_CLEARANCE)}>
      <nav
        className="mb-3 flex gap-1.5 overflow-x-auto rounded-xl border border-rw-line/60 bg-rw-surfaceAlt/80 p-1 lg:hidden"
        aria-label={t("cassa.enterprise.panelNav")}
      >
        {mobilePanels.map((panel) => (
          <button
            key={panel.id}
            type="button"
            onClick={() => setMobilePanel(panel.id)}
            className={cn(
              "inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
              mobilePanel === panel.id
                ? "bg-[#D4AF37] text-black"
                : "text-rw-soft hover:bg-rw-surface hover:text-rw-ink",
            )}
          >
            {panel.label}
          </button>
        ))}
      </nav>

      <div
        className={cn(
          "grid min-h-0 gap-3",
          "lg:min-h-[calc(100vh-18rem)] lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)_auto_auto]",
          "xl:grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)_minmax(18rem,32%)_minmax(5.5rem,7.5rem)] xl:grid-rows-1",
        )}
      >
        <div
          className={cn(
            "min-h-0 lg:col-start-1 lg:row-start-1 xl:col-start-auto xl:row-start-auto",
            panelVisibility(mobilePanel, "tables"),
          )}
        >
          <CassaTableGrid
            grouped={grouped}
            selectedTable={selectedTable}
            onSelectTable={setSelectedTable}
            onFlash={doFlash}
            openOrdersCount={servedOrders.length}
          />
        </div>

        <div
          className={cn(
            "min-h-0 lg:col-start-2 lg:row-start-1 xl:col-start-auto xl:row-start-auto",
            panelVisibility(mobilePanel, "bill"),
          )}
        >
          <CassaBillDetail
            selected={selected}
            allItems={allItems}
            subtotal={subtotal}
            discount={discount}
            setDiscount={setDiscount}
            vatOverride={vatOverride}
            setVatOverride={setVatOverride}
            discountVal={discountVal}
            vatVal={vatVal}
            afterDiscount={afterDiscount}
            total={total}
            flash={flash}
            onCloseTable={handleCloseTable}
            onFlash={doFlash}
          />
        </div>

        <div
          className={cn(
            "min-h-0 lg:col-span-2 lg:row-start-2 xl:col-span-1 xl:col-start-auto xl:row-start-auto",
            panelVisibility(mobilePanel, "menu"),
          )}
        >
          <CassaQuickMenu
            menuItems={menuItems}
            onProductTap={(item) =>
              doFlash(`${item.name} — € ${item.price.toFixed(2)}${item.notes ? ` · ${item.notes}` : ""}`)
            }
          />
        </div>

        <div
          className={cn(
            "min-h-0 lg:col-span-2 lg:row-start-3 xl:col-span-1 xl:col-start-auto xl:row-start-auto",
            panelVisibility(mobilePanel, "actions"),
          )}
        >
          <CassaActionSidebar
            onAction={(key) => doFlash(t(key))}
            onPrintBill={() => doFlash(t("cassa.printBill.flash"))}
          />
        </div>
      </div>

      <CassaPayButton total={total} disabled={!selected || total <= 0} onPay={handlePay} />
    </div>
  );
}
