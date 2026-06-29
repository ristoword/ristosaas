"use client";

import { useCallback, useMemo, useState } from "react";
import { useI18n } from "@/core/i18n/provider";
import type { Order, MenuItem as ApiMenuItem } from "@/lib/api-client";
import { CassaTableGrid } from "./table-grid";
import { CassaBillDetail } from "./bill-detail";
import { CassaQuickMenu } from "./quick-menu";
import { CassaActionSidebar } from "./action-sidebar";
import { CassaPayButton } from "./pay-button";

type Props = {
  servedOrders: Order[];
  menuItems: ApiMenuItem[];
  onCloseTable: (id: string) => void;
};

export function CassaEnterpriseWorkspace({ servedOrders, menuItems, onCloseTable }: Props) {
  const { t } = useI18n();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [discount, setDiscount] = useState("");
  const [vatOverride, setVatOverride] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

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

  const handleCloseTable = useCallback(() => {
    for (const o of tableOrders) {
      onCloseTable(o.id);
    }
    setSelectedTable(null);
    doFlash(t("cassa.closeTable.flash"));
  }, [tableOrders, onCloseTable, doFlash, t]);

  const handlePay = useCallback(() => {
    if (!selected) {
      doFlash(t("cassa.noTableSelected"));
      return;
    }
    handleCloseTable();
  }, [selected, doFlash, t, handleCloseTable]);

  return (
    <div className="relative pb-36">
      <div className="grid min-h-[calc(100vh-18rem)] gap-3 xl:grid-cols-[minmax(14rem,16rem)_minmax(0,1.2fr)_minmax(14rem,1fr)_minmax(5.5rem,7.5rem)]">
        <CassaTableGrid
          grouped={grouped}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          onFlash={doFlash}
          openOrdersCount={servedOrders.length}
        />

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

        <CassaQuickMenu
          menuItems={menuItems}
          onProductTap={(item) =>
            doFlash(`${item.name} — € ${item.price.toFixed(2)}${item.notes ? ` · ${item.notes}` : ""}`)
          }
        />

        <CassaActionSidebar
          onAction={(key) => doFlash(t(key))}
          onPrintBill={() => doFlash(t("cassa.printBill.flash"))}
        />
      </div>

      <CassaPayButton total={total} disabled={!selected || total <= 0} onPay={handlePay} />
    </div>
  );
}
