"use client";

import { useCallback, useState } from "react";
import { KeyRound, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useHotel } from "@/components/hotel/hotel-context";
import { hotelApi } from "@/lib/api-client";

const cardTone = {
  attiva: "success",
  scaduta: "warn",
  annullata: "danger",
} as const;

export function HotelKeycardsPage() {
  const { keycards, reservations, rooms, refresh } = useHotel();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const runAction = useCallback(
    async (id: string, action: "encode" | "revoke") => {
      setBusyId(id);
      setMessage(null);
      try {
        if (action === "encode") {
          const result = await hotelApi.encodeKeycard(id);
          setMessage(`Keycard codificata — ${result.lock.credentialId ?? "OK"}`);
        } else {
          await hotelApi.revokeKeycard(id);
          setMessage("Keycard revocata.");
        }
        await refresh();
      } catch (e) {
        setMessage(e instanceof Error ? e.message : "Operazione non riuscita");
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Keycard / Serrature" subtitle="Emissione, codifica bridge, rinnovo e revoca card hotel.">
        <Chip label="Card attive" value={keycards.filter((item) => item.status === "attiva").length} tone="success" />
      </PageHeader>

      {message ? (
        <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-soft">{message}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card title="Registry keycard" description="Ogni tessera è collegata a camera, prenotazione e operatore.">
          <DataTable
            columns={[
              { key: "id", header: "Card", render: (row) => <span className="font-mono text-xs text-rw-ink">{row.id.slice(0, 8)}…</span> },
              {
                key: "roomId",
                header: "Camera",
                render: (row) => {
                  const room = rooms.find((item) => item.id === row.roomId);
                  return <span className="text-rw-ink">{room?.code || row.roomId}</span>;
                },
              },
              {
                key: "reservationId",
                header: "Prenotazione",
                render: (row) => {
                  const reservation = reservations.find((item) => item.id === row.reservationId);
                  return <span className="text-rw-soft">{reservation?.guestName || row.reservationId}</span>;
                },
              },
              {
                key: "lock",
                header: "Serratura",
                render: (row) => (
                  <span className="text-xs text-rw-soft">
                    {row.lockCredentialId ? row.lockCredentialId.slice(0, 12) : "—"}
                  </span>
                ),
              },
              { key: "validity", header: "Validità", render: (row) => <span className="text-rw-soft">{row.validFrom.slice(0, 16)} → {row.validUntil.slice(0, 16)}</span> },
              { key: "status", header: "Stato", render: (row) => <Chip label={row.status} tone={cardTone[row.status]} /> },
              {
                key: "actions",
                header: "",
                render: (row) =>
                  row.status === "attiva" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void runAction(row.id, "encode")}
                        className="rounded-lg border border-rw-line px-2 py-1 text-xs text-rw-ink hover:border-rw-accent"
                        title="Codifica su bridge serrature"
                      >
                        {busyId === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void runAction(row.id, "revoke")}
                        className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                        title="Revoca"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : null,
              },
            ]}
            data={keycards}
            keyExtractor={(row) => row.id}
          />
        </Card>

        <Card title="Bridge serrature" description="Configura URL e API key in Integrazioni compliance. Al check-in la codifica è automatica se abilitata.">
          <div className="space-y-3 text-sm text-rw-soft">
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <KeyRound className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Encode manuale</p>
              </div>
              <p className="mt-2">Per card già emesse senza codifica automatica.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Check-in automatico</p>
              </div>
              <p className="mt-2">Con bridge attivo, la keycard viene codificata in reception al check-in.</p>
            </div>
            <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="flex items-center gap-3">
                <ShieldOff className="h-5 w-5 text-rw-accent" />
                <p className="font-semibold text-rw-ink">Revoca al checkout</p>
              </div>
              <p className="mt-2">Il checkout revoca le credenziali attive sul bridge configurato.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
