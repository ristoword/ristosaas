"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Save,
  Send,
  Shield,
  ShieldAlert,
  Trash2,
  UserCog,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { DataTable } from "@/components/shared/data-table";
import { useAuth } from "@/components/auth/auth-context";
import {
  api,
  billingApi,
  reportsApi,
  staffApi,
  type AdminEmailConfig,
  type BillingReadiness,
  type BillingSubscription,
  type ReportTrendsSnapshot,
  type StaffMember,
  type UnifiedReportSnapshot,
} from "@/lib/api-client";
import { formatHumanDate } from "@/lib/date-utils";
import { useI18n } from "@/core/i18n/provider";

const inputCls =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rw-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rw-accent/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

type NewStaffDraft = {
  name: string;
  email: string;
  phone: string;
  role: string;
  hireDate: string;
  salary: number;
  hoursWeek: number;
  status: StaffMember["status"];
  notes: string;
};

const EMPTY_DRAFT: NewStaffDraft = {
  name: "",
  email: "",
  phone: "",
  role: "Cameriere",
  hireDate: "",
  salary: 0,
  hoursWeek: 40,
  status: "attivo",
  notes: "",
};

type SmtpDraft = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  secure: boolean;
};

const EMPTY_SMTP: SmtpDraft = {
  host: "",
  port: 587,
  username: "",
  password: "",
  fromAddress: "",
  secure: false,
};

export function OwnerPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [trends, setTrends] = useState<ReportTrendsSnapshot | null>(null);
  const [unified, setUnified] = useState<UnifiedReportSnapshot | null>(null);
  const [readiness, setReadiness] = useState<BillingReadiness | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<NewStaffDraft>(EMPTY_DRAFT);
  const [creatingStaff, setCreatingStaff] = useState(false);

  const [smtpConfigs, setSmtpConfigs] = useState<AdminEmailConfig[]>([]);
  const [smtpTenantId, setSmtpTenantId] = useState<string>("");
  const [smtp, setSmtp] = useState<SmtpDraft>(EMPTY_SMTP);
  const [smtpBusy, setSmtpBusy] = useState<"save" | "test" | null>(null);
  const [smtpMessage, setSmtpMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trendRes, unifiedRes, staffRes, readinessRes, billingRes] = await Promise.all([
        reportsApi.trends().catch(() => null),
        reportsApi.unified().catch(() => null),
        staffApi.list().catch(() => []),
        billingApi.readiness().catch(() => null),
        billingApi.overview().catch(() => null),
      ]);
      setTrends(trendRes);
      setUnified(unifiedRes);
      setStaff(staffRes);
      setReadiness(readinessRes);
      setSubscription(billingRes?.subscription ?? null);

      if (isSuperAdmin) {
        const configs = await api.admin.emailConfig.list().catch(() => []);
        setSmtpConfigs(configs);
        if (configs.length > 0) {
          setSmtpTenantId(configs[0].tenantId);
          const first = configs[0];
          setSmtp({
            host: first.host,
            port: first.port,
            username: first.username,
            password: "",
            fromAddress: first.fromAddress,
            secure: first.secure,
          });
        }
      }
    } catch (err) {
      setError((err as Error).message || t("owner.loadError"));
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreateStaff() {
    if (!draft.name.trim()) return;
    setCreatingStaff(true);
    setError(null);
    try {
      await staffApi.create({
        name: draft.name,
        email: draft.email,
        phone: draft.phone,
        role: draft.role,
        hireDate: draft.hireDate || new Date().toISOString().slice(0, 10),
        salary: draft.salary,
        hoursWeek: draft.hoursWeek,
        status: draft.status,
        notes: draft.notes,
      });
      setDraft(EMPTY_DRAFT);
      const refreshed = await staffApi.list();
      setStaff(refreshed);
    } catch (err) {
      setError((err as Error).message || t("owner.createStaffError"));
    } finally {
      setCreatingStaff(false);
    }
  }

  async function handleDeleteStaff(id: string) {
    if (!confirm(t("owner.confirmRemove"))) return;
    try {
      await staffApi.delete(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError((err as Error).message || t("owner.deleteStaffError"));
    }
  }

  async function handleToggleStaffStatus(row: StaffMember) {
    const nextStatus: StaffMember["status"] = row.status === "attivo" ? "licenziato" : "attivo";
    try {
      const updated = await staffApi.update(row.id, { status: nextStatus });
      setStaff((prev) => prev.map((s) => (s.id === row.id ? updated : s)));
    } catch (err) {
      setError((err as Error).message || t("owner.updateStaffError"));
    }
  }

  async function handleSaveSmtp() {
    if (!smtpTenantId) return;
    setSmtpBusy("save");
    setSmtpMessage(null);
    try {
      await api.admin.emailConfig.save(smtpTenantId, smtp);
      setSmtpMessage(t("owner.smtp.saved"));
      const configs = await api.admin.emailConfig.list();
      setSmtpConfigs(configs);
    } catch (err) {
      setSmtpMessage((err as Error).message || t("owner.smtp.saveError"));
    } finally {
      setSmtpBusy(null);
    }
  }

  async function handleTestSmtp() {
    if (!smtpTenantId) return;
    setSmtpBusy("test");
    setSmtpMessage(null);
    try {
      const response = await api.admin.emailConfig.test(smtpTenantId);
      if (response.error) {
        setSmtpMessage(`${t("owner.smtp.sendFailed")}: ${response.error}`);
      } else {
        setSmtpMessage(
          `${t("owner.smtp.testSent")}${response.recipient ? ` ${t("owner.smtp.to")} ${response.recipient}` : ""}. ${t("owner.smtp.checkInbox")}`,
        );
      }
    } catch (err) {
      setSmtpMessage((err as Error).message || t("owner.smtp.testError"));
    } finally {
      setSmtpBusy(null);
    }
  }

  function pickTenant(tenantId: string) {
    setSmtpTenantId(tenantId);
    const match = smtpConfigs.find((c) => c.tenantId === tenantId);
    if (match) {
      setSmtp({
        host: match.host,
        port: match.port,
        username: match.username,
        password: "",
        fromAddress: match.fromAddress,
        secure: match.secure,
      });
    } else {
      setSmtp(EMPTY_SMTP);
    }
  }

  const checklistItems = useMemo(() => {
    const env = readiness?.envChecks ?? [];
    const tenant = readiness?.tenantChecks ?? [];
    return [...env, ...tenant];
  }, [readiness]);

  const tenantPlan = readiness?.tenantSummary?.plan ?? "—";
  const licenseStatus = readiness?.tenantSummary?.licenseStatus ?? null;
  const seatUsage = `${readiness?.tenantSummary?.usedSeats ?? 0} / ${readiness?.tenantSummary?.seats ?? 0}`;
  const currentPeriodEnd = subscription?.currentPeriodEnd ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("owner.title")}
        subtitle={t("owner.subtitle")}
      />

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt p-3 text-sm text-rw-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("owner.loading")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title={t("owner.licenseCard")} headerRight={<Shield className="h-4 w-4 text-emerald-400" />}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {readiness?.tenantReady ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400">
                    {licenseStatus || subscription?.status || t("owner.licenseActive")}
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400">{t("owner.licenseNotReady")}</span>
                </>
              )}
            </div>
            <div className="space-y-1 text-xs text-rw-soft">
              <p>
                {t("owner.plan")}: <span className="font-semibold text-rw-ink">{tenantPlan}</span>
              </p>
              <p>
                {t("owner.renewal")}:{" "}
                <span className="font-semibold text-rw-ink">
                  {currentPeriodEnd ? formatHumanDate(currentPeriodEnd.slice(0, 10)) : "—"}
                </span>
              </p>
              <p>
                {t("owner.seats")}: <span className="font-semibold text-rw-ink">{seatUsage}</span>
              </p>
            </div>
            <Chip
              label={t("owner.revenue30d")}
              value={`€ ${(trends?.month.revenue ?? 0).toFixed(2)}`}
              tone="accent"
            />
            <Chip
              label={t("owner.realCosts")}
              value={`€ ${(unified?.realCosts?.totalCost ?? 0).toFixed(2)}`}
            />
            <Chip
              label={t("owner.forecast7d")}
              value={`€ ${(trends?.forecast.next7.projectedRevenue ?? 0).toFixed(2)}`}
            />
            <Chip
              label={t("owner.forecast30d")}
              value={`€ ${(trends?.forecast.next30.projectedRevenue ?? 0).toFixed(2)}`}
            />
          </div>
        </Card>

        <Card title={t("owner.staffCard")} headerRight={<Users className="h-4 w-4 text-rw-muted" />}>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">{t("owner.totalUsers")}</span>
              <span className="text-2xl font-bold text-rw-ink">{staff.length}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">{t("owner.activeStaff")}</span>
              <span className="text-lg font-semibold text-emerald-400">
                {staff.filter((s) => s.status === "attivo").length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">{t("owner.disabledStaff")}</span>
              <span className="text-lg font-semibold text-red-400">
                {staff.filter((s) => s.status === "licenziato").length}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">{t("owner.margin7d")}</span>
              <span className="text-lg font-semibold text-rw-ink">
                € {(trends?.week.margin ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-rw-muted">{t("owner.staffHoursPeriod")}</span>
              <span className="text-lg font-semibold text-rw-ink">
                {(unified?.staffOps?.totalHours ?? 0).toFixed(1)}h
              </span>
            </div>
          </div>
        </Card>

        <Card
          title={t("owner.checklistCard")}
          headerRight={<UserCog className="h-4 w-4 text-rw-accent" />}
        >
          <ul className="space-y-2 text-xs">
            {checklistItems.length === 0 && (
              <li className="text-rw-muted">{t("owner.noChecks")}</li>
            )}
            {checklistItems.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                {item.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 text-amber-400" />
                )}
                <div>
                  <p className="font-semibold text-rw-ink">{item.key}</p>
                  <p className="text-rw-muted">{item.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title={t("owner.hotelCard")}
          description={t("owner.hotelCardDesc")}
          headerRight={<Users className="h-4 w-4 text-rw-muted" />}
        >
          <div className="space-y-2 text-xs">
            <div className="flex items-baseline justify-between">
              <span className="text-rw-muted">{t("owner.occupiedRooms")}</span>
              <span className="font-semibold text-rw-ink">
                {unified?.occupancy.occupiedRooms ?? 0} /{" "}
                {unified?.occupancy.totalRooms ?? 0}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-rw-muted">{t("owner.arrivalsToday")}</span>
              <span className="font-semibold text-rw-ink">{unified?.arrivalsToday ?? 0}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-rw-muted">{t("owner.departuresToday")}</span>
              <span className="font-semibold text-rw-ink">{unified?.departuresToday ?? 0}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-rw-muted">{t("owner.openFolios")}</span>
              <span className="font-semibold text-rw-ink">{unified?.openFolios ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title={t("owner.manageStaff")}
        description={t("owner.manageStaffDesc")}
        headerRight={<Users className="h-4 w-4 text-rw-accent" />}
      >
        <form
          className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreateStaff();
          }}
        >
          <div>
            <label className={labelCls}>{t("staff.fullName")}</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("staff.fullName")}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("ui.email")}</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
              placeholder="email@ristorante.it"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>{t("staff.role")}</label>
            <select
              className={inputCls}
              value={draft.role}
              onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
            >
              <option>Admin</option>
              <option>Cameriere</option>
              <option>Cucina</option>
              <option>Cassa</option>
              <option>Bar</option>
              <option>Pizzeria</option>
              <option>Reception</option>
              <option>Housekeeping</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creatingStaff || !draft.name.trim()}
              className={cn(btnPrimary, "w-full")}
            >
              {creatingStaff ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t("owner.addEmployee")}
            </button>
          </div>
        </form>

        <DataTable<StaffMember>
          columns={[
            { key: "name", header: t("staff.fullName") },
            { key: "role", header: t("staff.role") },
            { key: "email", header: t("ui.email") },
            {
              key: "status",
              header: t("ui.status"),
              render: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStaffStatus(r)}
                    className="relative inline-flex cursor-pointer items-center"
                    aria-label="Cambia stato"
                  >
                    <input
                      type="checkbox"
                      checked={r.status === "attivo"}
                      readOnly
                      className="peer sr-only"
                    />
                    <div className="h-5 w-9 rounded-full bg-rw-surfaceAlt peer-checked:bg-emerald-500 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-rw-line after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
                  </button>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      r.status === "attivo" ? "text-emerald-400" : "text-rw-muted",
                    )}
                  >
                    {r.status}
                  </span>
                </div>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (r) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(r.id)}
                    className="text-rw-muted hover:text-red-400"
                    title={t("ui.remove")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          data={staff}
          keyExtractor={(r) => r.id}
          emptyMessage={t("owner.noEmployees")}
        />
      </Card>

      {isSuperAdmin && (
        <Card
          title={t("owner.smtp.title")}
          description={t("owner.smtp.desc")}
          headerRight={<Mail className="h-4 w-4 text-rw-muted" />}
        >
          {smtpConfigs.length === 0 ? (
            <p className="text-sm text-rw-muted">
              {t("owner.smtp.noConfig")}
            </p>
          ) : (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-rw-muted">{t("owner.smtp.tenant")}</label>
              <select
                className={cn(inputCls, "max-w-xs")}
                value={smtpTenantId}
                onChange={(e) => pickTenant(e.target.value)}
              >
                {smtpConfigs.map((c) => (
                  <option key={c.tenantId} value={c.tenantId}>
                    {c.tenantName || c.tenantId}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSaveSmtp();
            }}
          >
            <div>
              <label className={labelCls}>{t("owner.smtp.host")}</label>
              <input
                type="text"
                className={inputCls}
                value={smtp.host}
                onChange={(e) => setSmtp((p) => ({ ...p, host: e.target.value }))}
                placeholder="smtp.provider.com"
              />
            </div>
            <div>
              <label className={labelCls}>{t("owner.smtp.port")}</label>
              <input
                type="number"
                className={inputCls}
                value={smtp.port}
                onChange={(e) =>
                  setSmtp((p) => ({ ...p, port: parseInt(e.target.value, 10) || 587 }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>{t("owner.smtp.secure")}</label>
              <select
                className={inputCls}
                value={smtp.secure ? "tls" : "plain"}
                onChange={(e) => setSmtp((p) => ({ ...p, secure: e.target.value === "tls" }))}
              >
                <option value="plain">TLS (porta 587)</option>
                <option value="tls">SSL (porta 465)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{t("auth.username")}</label>
              <input
                type="text"
                className={inputCls}
                value={smtp.username}
                onChange={(e) => setSmtp((p) => ({ ...p, username: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>{t("auth.password")}</label>
              <input
                type="password"
                className={inputCls}
                value={smtp.password}
                onChange={(e) => setSmtp((p) => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className={labelCls}>{t("owner.smtp.sender")}</label>
              <input
                type="email"
                className={inputCls}
                value={smtp.fromAddress}
                onChange={(e) => setSmtp((p) => ({ ...p, fromAddress: e.target.value }))}
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" disabled={smtpBusy === "save" || !smtpTenantId} className={btnPrimary}>
                {smtpBusy === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("owner.smtp.saveConfig")}
              </button>
              <button
                type="button"
                onClick={handleTestSmtp}
                disabled={smtpBusy === "test" || !smtpTenantId}
                className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-5 py-2.5 text-sm font-semibold text-rw-soft hover:text-rw-ink disabled:opacity-60"
              >
                {smtpBusy === "test" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {t("owner.smtp.sendTest")}
              </button>
              <button
                type="button"
                onClick={() => setSmtp(EMPTY_SMTP)}
                className="inline-flex items-center gap-2 rounded-xl border border-rw-line px-5 py-2.5 text-sm font-semibold text-rw-muted hover:text-rw-soft"
              >
                <RotateCcw className="h-4 w-4" /> {t("owner.smtp.resetForm")}
              </button>
            </div>
          </form>
          {smtpMessage && (
            <p className="mt-3 text-sm text-rw-soft">{smtpMessage}</p>
          )}
        </Card>
      )}
    </div>
  );
}
