"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Battery,
  Eye,
  History,
  Loader2,
  RefreshCw,
  Send,
  ShieldOff,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useAuth } from "@/components/auth/auth-context";
import { useI18n } from "@/core/i18n/provider";
import { tf } from "@/core/i18n/interpolate";
import {
  mobileAccessApi,
  type AccessCredential,
  type AccessCredentialType,
  type DoorAccessLogEntry,
  type MobileAccessDashboard,
  type MobileAccessDeliveryChannel,
} from "@/lib/api-client";

const WRITE_ROLES = new Set(["hotel_manager", "reception", "supervisor", "owner", "super_admin"]);

const statusTone = {
  pending: "warn",
  active: "success",
  expired: "warn",
  revoked: "danger",
} as const;

const SEND_CHANNELS: MobileAccessDeliveryChannel[] = ["email", "sms", "whatsapp", "qr", "link"];

export function HotelMobileAccessPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const canWrite = user ? WRITE_ROLES.has(user.role) : false;

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<MobileAccessDashboard | null>(null);
  const [items, setItems] = useState<AccessCredential[]>([]);
  const [logs, setLogs] = useState<DoorAccessLogEntry[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<AccessCredential | null>(null);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, logsRes] = await Promise.all([mobileAccessApi.list(), mobileAccessApi.logs(80)]);
      setDashboard(listRes.dashboard);
      setItems(listRes.items);
      setLogs(logsRes.logs);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("hotel.mobileAccess.err.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredLogs = useMemo(() => {
    if (!historyFor) return [];
    return logs.filter((log) => log.credentialId === historyFor);
  }, [historyFor, logs]);

  const typeLabel = useCallback(
    (type: AccessCredentialType) => t(`hotel.mobileAccess.type.${type}`),
    [t],
  );

  const runAction = useCallback(
    async (id: string, action: "revoke" | "regenerate" | "view") => {
      setBusyId(id);
      setMessage(null);
      try {
        if (action === "view") {
          const item = await mobileAccessApi.get(id);
          setDetail(item);
        } else if (action === "revoke") {
          await mobileAccessApi.revoke(id);
          setMessage(t("hotel.mobileAccess.msg.revoked"));
          await load();
        } else {
          await mobileAccessApi.regenerate(id);
          setMessage(t("hotel.mobileAccess.msg.regenerated"));
          await load();
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : t("hotel.mobileAccess.err.action"));
      } finally {
        setBusyId(null);
      }
    },
    [load, t],
  );

  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const sendCredential = useCallback(
    async (id: string, channel: MobileAccessDeliveryChannel) => {
      setBusyId(id);
      setMessage(null);
      setQrUrl(null);
      setLinkUrl(null);
      try {
        const result = await mobileAccessApi.send(id, channel);
        const channelLabel = t(`hotel.mobileAccess.send.${channel}`);
        setMessage(tf(t, "hotel.mobileAccess.msg.sent", { channel: channelLabel }));
        if (result.secureUrl) {
          if (channel === "qr") {
            setQrUrl(result.secureUrl);
          } else if (channel === "link") {
            setLinkUrl(result.secureUrl);
          }
        }
      } catch (e) {
        setMessage(e instanceof Error ? e.message : t("hotel.mobileAccess.err.action"));
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  const dash = dashboard ?? {
    mobileKeysActive: 0,
    mobileKeysExpired: 0,
    rfidCardsActive: 0,
    doorsOpenedToday: 0,
    lastAccessAt: null,
    accessSuccessToday: 0,
    accessFailedToday: 0,
    locksOnline: 0,
    locksOffline: 0,
    avgBatteryLevel: null,
    lastSyncAt: null,
  };

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title={t("hotel.mobileAccess.page.title")} subtitle={t("hotel.mobileAccess.page.subtitle")}>
        <Chip label={t("hotel.mobileAccess.dashboard.mobileActive")} value={dash.mobileKeysActive} tone="success" />
        <Chip label={t("hotel.mobileAccess.dashboard.rfidActive")} value={dash.rfidCardsActive} tone="info" />
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-3 py-2 text-sm text-rw-ink hover:border-rw-accent"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {t("hotel.mobileAccess.action.refresh")}
        </button>
      </PageHeader>

      {message ? (
        <p className="rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-soft">{message}</p>
      ) : null}

      {qrUrl ? (
        <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-6 text-center">
          <p className="mb-4 text-sm font-medium text-rw-ink">{t("hotel.mobileAccess.qr.title")}</p>
          <div className="mx-auto w-56 rounded-xl bg-white p-4">
            <QrCode url={qrUrl} />
          </div>
          <p className="mt-3 break-all text-xs text-rw-muted">{qrUrl}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rw-line px-3 py-1.5 text-xs text-rw-ink hover:border-rw-accent"
            onClick={() => setQrUrl(null)}
          >
            {t("hotel.mobileAccess.detail.close")}
          </button>
        </div>
      ) : null}

      {linkUrl ? (
        <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
          <p className="mb-2 text-sm font-medium text-rw-ink">{t("hotel.mobileAccess.link.title")}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={linkUrl}
              className="flex-1 rounded-lg border border-rw-line bg-rw-surface px-3 py-2 text-xs font-mono text-rw-ink"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="rounded-lg border border-rw-line px-3 py-2 text-xs text-rw-ink hover:border-rw-accent"
              onClick={() => { void navigator.clipboard.writeText(linkUrl); setMessage(t("hotel.mobileAccess.link.copied")); }}
            >
              {t("hotel.mobileAccess.link.copy")}
            </button>
          </div>
          <button
            type="button"
            className="mt-3 rounded-lg border border-rw-line px-3 py-1.5 text-xs text-rw-ink hover:border-rw-accent"
            onClick={() => setLinkUrl(null)}
          >
            {t("hotel.mobileAccess.detail.close")}
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Smartphone} label={t("hotel.mobileAccess.dashboard.mobileActive")} value={dash.mobileKeysActive} />
        <StatCard icon={Smartphone} label={t("hotel.mobileAccess.dashboard.mobileExpired")} value={dash.mobileKeysExpired} />
        <StatCard icon={Wifi} label={t("hotel.mobileAccess.dashboard.locksOnline")} value={dash.locksOnline} />
        <StatCard icon={WifiOff} label={t("hotel.mobileAccess.dashboard.locksOffline")} value={dash.locksOffline} />
        <StatCard icon={History} label={t("hotel.mobileAccess.dashboard.doorsToday")} value={dash.doorsOpenedToday} />
        <StatCard icon={History} label={t("hotel.mobileAccess.dashboard.successToday")} value={dash.accessSuccessToday} tone="success" />
        <StatCard icon={ShieldOff} label={t("hotel.mobileAccess.dashboard.failedToday")} value={dash.accessFailedToday} tone="danger" />
        <StatCard
          icon={Battery}
          label={t("hotel.mobileAccess.dashboard.battery")}
          value={dash.avgBatteryLevel != null ? `${Math.round(dash.avgBatteryLevel)}%` : "—"}
        />
      </div>

      <div className="grid gap-4 text-xs text-rw-soft sm:grid-cols-2">
        <p>
          {t("hotel.mobileAccess.dashboard.lastAccess")}:{" "}
          <span className="text-rw-ink">{dash.lastAccessAt ? dash.lastAccessAt.slice(0, 16).replace("T", " ") : "—"}</span>
        </p>
        <p>
          {t("hotel.mobileAccess.dashboard.lastSync")}:{" "}
          <span className="text-rw-ink">{dash.lastSyncAt ? dash.lastSyncAt.slice(0, 16).replace("T", " ") : "—"}</span>
        </p>
      </div>

      <Card title={t("hotel.mobileAccess.table.title")} description={t("hotel.mobileAccess.table.desc")}>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-rw-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("hotel.mobileAccess.loading")}
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: "room",
                header: t("hotel.mobileAccess.table.room"),
                render: (row) => <span className="font-medium text-rw-ink">{row.roomCode ?? row.roomId.slice(0, 8)}</span>,
              },
              {
                key: "guest",
                header: t("hotel.mobileAccess.table.guest"),
                render: (row) => <span className="text-rw-soft">{row.guestName ?? "—"}</span>,
              },
              {
                key: "method",
                header: t("hotel.mobileAccess.table.method"),
                render: (row) => <span className="text-xs text-rw-ink">{typeLabel(row.credentialType)}</span>,
              },
              {
                key: "provider",
                header: t("hotel.mobileAccess.table.provider"),
                render: (row) => <span className="font-mono text-xs text-rw-soft">{row.provider}</span>,
              },
              {
                key: "validFrom",
                header: t("hotel.mobileAccess.table.validFrom"),
                render: (row) => <span className="text-xs text-rw-soft">{row.validFrom.slice(0, 16).replace("T", " ")}</span>,
              },
              {
                key: "validUntil",
                header: t("hotel.mobileAccess.table.validUntil"),
                render: (row) => <span className="text-xs text-rw-soft">{row.validUntil.slice(0, 16).replace("T", " ")}</span>,
              },
              {
                key: "lastUsed",
                header: t("hotel.mobileAccess.table.lastUsed"),
                render: (row) => (
                  <span className="text-xs text-rw-soft">
                    {row.lastUsedAt ? row.lastUsedAt.slice(0, 16).replace("T", " ") : "—"}
                  </span>
                ),
              },
              {
                key: "status",
                header: t("hotel.mobileAccess.table.status"),
                render: (row) => (
                  <Chip label={t(`hotel.mobileAccess.status.${row.status}`)} tone={statusTone[row.status]} />
                ),
              },
              {
                key: "actions",
                header: t("hotel.mobileAccess.table.actions"),
                render: (row) => (
                  <div className="flex flex-wrap gap-1">
                    <ActionBtn
                      title={t("hotel.mobileAccess.action.view")}
                      disabled={busyId === row.id}
                      onClick={() => void runAction(row.id, "view")}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </ActionBtn>
                    {canWrite && row.status === "active" ? (
                      <>
                        <ActionBtn
                          title={t("hotel.mobileAccess.action.regenerate")}
                          disabled={busyId === row.id}
                          onClick={() => void runAction(row.id, "regenerate")}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <ActionBtn
                          title={t("hotel.mobileAccess.action.revoke")}
                          disabled={busyId === row.id}
                          danger
                          onClick={() => void runAction(row.id, "revoke")}
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                        </ActionBtn>
                        <SendMenu
                          disabled={busyId === row.id}
                          onSend={(ch) => void sendCredential(row.id, ch)}
                          t={t}
                        />
                      </>
                    ) : null}
                    <ActionBtn
                      title={t("hotel.mobileAccess.action.history")}
                      disabled={busyId === row.id}
                      onClick={() => setHistoryFor(historyFor === row.id ? null : row.id)}
                    >
                      <History className="h-3.5 w-3.5" />
                    </ActionBtn>
                  </div>
                ),
              },
            ]}
            data={items}
            keyExtractor={(row) => row.id}
          />
        )}
      </Card>

      {historyFor ? (
        <Card title={t("hotel.mobileAccess.history.title")} description={t("hotel.mobileAccess.history.desc")}>
          <DataTable
            columns={[
              {
                key: "timestamp",
                header: t("hotel.mobileAccess.history.when"),
                render: (row) => <span className="text-xs text-rw-soft">{row.timestamp.slice(0, 19).replace("T", " ")}</span>,
              },
              { key: "room", header: t("hotel.mobileAccess.table.room"), render: (row) => row.roomCode ?? "—" },
              { key: "action", header: t("hotel.mobileAccess.history.action"), render: (row) => row.action },
              {
                key: "result",
                header: t("hotel.mobileAccess.history.result"),
                render: (row) => (
                  <Chip
                    label={row.result}
                    tone={row.result === "success" ? "success" : "danger"}
                  />
                ),
              },
              { key: "device", header: t("hotel.mobileAccess.history.device"), render: (row) => row.device ?? "—" },
            ]}
            data={filteredLogs}
            keyExtractor={(row) => row.id}
          />
        </Card>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog">
          <div className="w-full max-w-lg rounded-2xl border border-rw-line bg-rw-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-rw-ink">{t("hotel.mobileAccess.detail.title")}</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <DetailRow label={t("hotel.mobileAccess.table.guest")} value={detail.guestName ?? "—"} />
              <DetailRow label={t("hotel.mobileAccess.table.room")} value={detail.roomCode ?? detail.roomId} />
              <DetailRow label={t("hotel.mobileAccess.table.method")} value={typeLabel(detail.credentialType)} />
              <DetailRow label={t("hotel.mobileAccess.table.provider")} value={detail.provider} />
              <DetailRow label={t("hotel.mobileAccess.table.status")} value={t(`hotel.mobileAccess.status.${detail.status}`)} />
              <DetailRow label={t("hotel.mobileAccess.table.validFrom")} value={detail.validFrom.slice(0, 16)} />
              <DetailRow label={t("hotel.mobileAccess.table.validUntil")} value={detail.validUntil.slice(0, 16)} />
              <DetailRow label="ID" value={detail.id} mono />
            </dl>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-rw-accent px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => setDetail(null)}
            >
              {t("hotel.mobileAccess.detail.close")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Smartphone;
  label: string;
  value: string | number;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-2xl border border-rw-line bg-rw-surfaceAlt p-4">
      <div className="flex items-center gap-2 text-rw-soft">
        <Icon className={`h-4 w-4 ${tone === "success" ? "text-emerald-400" : tone === "danger" ? "text-red-400" : "text-rw-accent"}`} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-rw-ink">{value}</p>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  disabled,
  danger,
  onClick,
}: {
  children: ReactNode;
  title: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-lg border px-2 py-1 text-xs hover:border-rw-accent disabled:opacity-40 ${
        danger ? "border-red-500/30 text-red-300 hover:bg-red-500/10" : "border-rw-line text-rw-ink"
      }`}
    >
      {children}
    </button>
  );
}

function SendMenu({
  disabled,
  onSend,
  t,
}: {
  disabled?: boolean;
  onSend: (ch: MobileAccessDeliveryChannel) => void;
  t: (key: string, fallback?: string) => string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <ActionBtn title={t("hotel.mobileAccess.action.resend")} disabled={disabled} onClick={() => setOpen((v) => !v)}>
        <Send className="h-3.5 w-3.5" />
      </ActionBtn>
      {open ? (
        <div className="absolute right-0 z-10 mt-1 min-w-[8rem] rounded-xl border border-rw-line bg-rw-surface p-1 shadow-lg">
          {SEND_CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-rw-ink hover:bg-rw-surfaceAlt"
              onClick={() => {
                setOpen(false);
                onSend(ch);
              }}
            >
              {t(`hotel.mobileAccess.send.${ch}`)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QrCode({ url }: { url: string }) {
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={qrSrc}
      alt="QR Code"
      width={200}
      height={200}
      className="mx-auto"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-rw-line/50 py-1">
      <dt className="text-rw-soft">{label}</dt>
      <dd className={`text-right text-rw-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
