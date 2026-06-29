"use client";

import { Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useI18n } from "@/core/i18n/provider";
import { useAiConfigCenter } from "@/hooks/use-ai-config-center";
import { useAiControlCenter } from "@/hooks/use-ai-control-center";
import { AiInfrastructurePanel } from "@/components/ai-configuration-center/ai-infrastructure-panel";
import {
  CONTROL_TABS,
  formatEur,
  HealthBadge,
  Kpi,
  type ControlTab,
} from "@/components/ai-configuration-center/ai-control-shared";

export function AiEnterpriseControlCenterPage() {
  const { t } = useI18n();
  const config = useAiConfigCenter();
  const control = useAiControlCenter();
  const [tab, setTab] = useState<ControlTab>("infrastructure");
  const [agentFilter, setAgentFilter] = useState("");
  const [embedSearch, setEmbedSearch] = useState("");

  const readOnly = control.data?.permissions.readOnly ?? false;
  const canMutate = control.data?.permissions.canMutateAgents ?? false;

  const filteredAgents = useMemo(() => {
    if (!control.data) return [];
    const q = agentFilter.trim().toLowerCase();
    if (!q) return control.data.agents;
    return control.data.agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.module.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q),
    );
  }, [control.data, agentFilter]);

  const loading = (config.loading && !config.data) || (control.loading && !control.data);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-rw-muted">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("aiControlCenter.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] space-y-6 px-3 py-4 sm:px-4 md:px-6">
      <PageHeader title={t("aiControlCenter.title")} subtitle={t("aiControlCenter.subtitle")}>
        <button
          type="button"
          onClick={() => {
            config.refresh();
            control.refresh();
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm text-rw-ink hover:bg-rw-surface"
        >
          <RefreshCw className={cn("h-4 w-4", (config.loading || control.loading) && "animate-spin")} />
          {t("aiControlCenter.refresh")}
        </button>
      </PageHeader>

      {readOnly && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {t("aiControlCenter.readOnly")}
        </div>
      )}

      {(config.error || control.error) && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {config.error ?? control.error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-rw-line bg-rw-surfaceAlt p-1">
        <div className="flex min-w-max gap-1">
          {CONTROL_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium sm:text-sm",
                tab === item.id ? "bg-rw-accent text-white" : "text-rw-muted hover:bg-rw-surface hover:text-rw-ink",
              )}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === "infrastructure" && config.data && <AiInfrastructurePanel data={config.data} config={config} canMutate={!readOnly} />}

      {tab === "agents" && control.data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
              placeholder={t("aiControlCenter.searchAgents")}
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
            />
          </div>
          <DataTable
            columns={[
              { key: "name", header: t("aiControlCenter.col.name"), render: (r) => r.name },
              { key: "module", header: t("aiControlCenter.col.module"), render: (r) => r.module },
              {
                key: "status",
                header: t("aiControlCenter.col.status"),
                render: (r) => <HealthBadge status={r.active ? "green" : "yellow"} />,
              },
              { key: "requests", header: t("aiControlCenter.col.requests"), render: (r) => r.stats.requestCount },
              { key: "tokens", header: t("aiControlCenter.col.tokens"), render: (r) => r.stats.tokensEstimate },
              {
                key: "cost",
                header: t("aiControlCenter.col.cost"),
                render: (r) => formatEur(r.stats.costEstimateEur),
              },
              { key: "errors", header: t("aiControlCenter.col.errors"), render: (r) => r.stats.errorCount },
              {
                key: "last",
                header: t("aiControlCenter.col.lastUsed"),
                render: (r) => (r.stats.lastUsedAt ? new Date(r.stats.lastUsedAt).toLocaleString("it-IT") : "—"),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  canMutate ? (
                    <button
                      type="button"
                      disabled={control.busy === "agent"}
                      className="text-xs text-red-300 hover:underline disabled:opacity-50"
                      onClick={() => control.deleteAgent(r.id)}
                    >
                      {t("aiControlCenter.delete")}
                    </button>
                  ) : null,
              },
            ]}
            data={filteredAgents}
            keyExtractor={(r) => r.id}
            emptyMessage={t("aiControlCenter.noAgents")}
          />
        </div>
      )}

      {tab === "prompts" && control.data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {canMutate && (
              <>
                <a
                  href={control.data ? "/api/admin/ai-control/prompts/import" : "#"}
                  className="rounded-lg border border-rw-line bg-rw-surface px-3 py-2 text-xs"
                >
                  {t("aiControlCenter.exportPrompts")}
                </a>
                <label className="cursor-pointer rounded-lg border border-rw-line bg-rw-surface px-3 py-2 text-xs">
                  {t("aiControlCenter.importPrompts")}
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const parsed = JSON.parse(await file.text()) as { templates?: unknown[] };
                      await control.importPrompts(parsed.templates ?? []);
                    }}
                  />
                </label>
              </>
            )}
          </div>
          <DataTable
            columns={[
              { key: "name", header: t("aiControlCenter.col.name"), render: (r) => r.name },
              { key: "key", header: "Key", render: (r) => r.key },
              { key: "module", header: t("aiControlCenter.col.module"), render: (r) => r.module },
              { key: "version", header: t("aiControlCenter.col.version"), render: (r) => `v${r.version}` },
              {
                key: "updated",
                header: t("aiControlCenter.col.updated"),
                render: (r) => new Date(r.updatedAt).toLocaleString("it-IT"),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  canMutate ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-rw-accent hover:underline"
                        onClick={() => control.duplicatePrompt(r.id, `${r.key}-copy-${Date.now()}`)}
                      >
                        {t("aiControlCenter.duplicate")}
                      </button>
                      {r.version > 1 && (
                        <button
                          type="button"
                          className="text-xs text-rw-accent hover:underline"
                          onClick={() => control.rollbackPrompt(r.id, r.version - 1)}
                        >
                          {t("aiControlCenter.rollback")}
                        </button>
                      )}
                    </div>
                  ) : null,
              },
            ]}
            data={control.data.prompts}
            keyExtractor={(r) => r.id}
            emptyMessage={t("aiControlCenter.noPrompts")}
          />
        </div>
      )}

      {tab === "knowledge" && (
        <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-6 text-center">
          <Database className="mx-auto mb-3 h-8 w-8 text-rw-accent" />
          <p className="mb-4 text-sm text-rw-muted">{t("aiControlCenter.knowledgeHint")}</p>
          <Link href="/ai-knowledge-base" className="inline-flex rounded-lg bg-rw-accent px-4 py-2 text-sm text-white">
            {t("aiControlCenter.openKnowledgeBase")}
          </Link>
        </div>
      )}

      {tab === "embeddings" && control.data && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-lg border border-rw-line bg-rw-surfaceAlt px-3 py-2 text-sm"
              placeholder={t("aiControlCenter.searchEmbeddings")}
              value={embedSearch}
              onChange={(e) => setEmbedSearch(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg border border-rw-line px-3 py-2 text-sm"
              onClick={() => control.refresh({ q: embedSearch })}
            >
              {t("aiControlCenter.search")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi label={t("aiControlCenter.totalChunks")} value={control.data.embeddings.total} />
          </div>
          <DataTable
            columns={[
              { key: "doc", header: t("aiControlCenter.col.document"), render: (r) => r.documentTitle ?? r.chunkKey },
              { key: "module", header: t("aiControlCenter.col.module"), render: (r) => r.module ?? "—" },
              { key: "dim", header: t("aiControlCenter.col.dimensions"), render: (r) => r.dimensions },
              { key: "provider", header: t("aiControlCenter.col.provider"), render: (r) => r.provider },
              { key: "tenant", header: "Tenant", render: (r) => r.tenantName ?? "—" },
              {
                key: "preview",
                header: t("aiControlCenter.col.chunk"),
                render: (r) => <span className="line-clamp-2 max-w-xs text-xs">{r.contentPreview}</span>,
              },
              {
                key: "updated",
                header: t("aiControlCenter.col.updated"),
                render: (r) => new Date(r.updatedAt).toLocaleString("it-IT"),
              },
              {
                key: "actions",
                header: "",
                render: (r) =>
                  canMutate ? (
                    <button
                      type="button"
                      className="text-xs text-red-300 hover:underline"
                      disabled={control.busy === "embedding"}
                      onClick={() => control.deleteEmbedding(r.id)}
                    >
                      {t("aiControlCenter.delete")}
                    </button>
                  ) : null,
              },
            ]}
            data={control.data.embeddings.rows}
            keyExtractor={(r) => r.id}
            emptyMessage={t("aiControlCenter.noEmbeddings")}
          />
        </div>
      )}

      {tab === "costs" && control.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Kpi label={t("aiControlCenter.costToday")} value={formatEur(control.data.costs.todayEur)} />
            <Kpi label={t("aiControlCenter.costMonth")} value={formatEur(control.data.costs.monthEur)} />
            <Kpi label={t("aiControlCenter.costYear")} value={formatEur(control.data.costs.yearEur)} />
            <Kpi label={t("aiControlCenter.tokensIn")} value={control.data.costs.tokensIn} />
            <Kpi label={t("aiControlCenter.tokensOut")} value={control.data.costs.tokensOut} />
            <Kpi label={t("aiControlCenter.avgTokens")} value={Math.round(control.data.costs.avgTokens)} />
          </div>
          <DataTable
            columns={[
              { key: "tenant", header: "Tenant", render: (r) => r.name },
              { key: "tokens", header: t("aiControlCenter.col.tokens"), render: (r) => r.tokens },
              { key: "eur", header: t("aiControlCenter.col.cost"), render: (r) => formatEur(r.eur) },
            ]}
            data={control.data.costs.byTenant}
            keyExtractor={(r) => r.tenantId}
            emptyMessage="—"
          />
          <DataTable
            columns={[
              { key: "module", header: t("aiControlCenter.col.module"), render: (r) => r.module },
              { key: "req", header: t("aiControlCenter.col.requests"), render: (r) => r.requests },
              { key: "tokens", header: t("aiControlCenter.col.tokens"), render: (r) => r.tokens },
              { key: "eur", header: t("aiControlCenter.col.cost"), render: (r) => formatEur(r.eur) },
            ]}
            data={control.data.costs.byAgent}
            keyExtractor={(r) => r.module}
            emptyMessage="—"
          />
        </div>
      )}

      {tab === "usage" && control.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Kpi label={t("aiControlCenter.totalRequests")} value={control.data.usage.totalRequests} />
          <DataTable
            columns={[
              { key: "module", header: t("aiControlCenter.col.module"), render: (r) => r.module },
              { key: "req", header: t("aiControlCenter.col.requests"), render: (r) => r.requests },
              { key: "tokens", header: t("aiControlCenter.col.tokens"), render: (r) => r.tokens },
              { key: "cost", header: t("aiControlCenter.col.cost"), render: (r) => formatEur(r.costEur) },
            ]}
            data={control.data.usage.topAgents}
            keyExtractor={(r) => r.module}
            emptyMessage="—"
          />
          <DataTable
            columns={[
              { key: "date", header: t("aiControlCenter.col.date"), render: (r) => r.date },
              { key: "req", header: t("aiControlCenter.col.requests"), render: (r) => r.requests },
              { key: "err", header: t("aiControlCenter.col.errors"), render: (r) => r.errors },
            ]}
            data={control.data.usage.trendDaily}
            keyExtractor={(r) => r.date}
            emptyMessage="—"
          />
        </div>
      )}

      {tab === "errors" && control.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {control.data.errors.byType.map((e) => (
              <Kpi key={e.type} label={e.type} value={e.count} />
            ))}
          </div>
          <DataTable
            columns={[
              { key: "type", header: t("aiControlCenter.col.type"), render: (r) => r.type },
              { key: "ctx", header: t("aiControlCenter.col.module"), render: (r) => r.context },
              {
                key: "msg",
                header: t("aiControlCenter.col.message"),
                render: (r) => <span className="line-clamp-2 max-w-md text-xs">{r.message}</span>,
              },
              {
                key: "at",
                header: t("aiControlCenter.col.when"),
                render: (r) => new Date(r.createdAt).toLocaleString("it-IT"),
              },
            ]}
            data={control.data.errors.recent}
            keyExtractor={(r) => r.id}
            emptyMessage={t("aiControlCenter.noErrors")}
          />
        </div>
      )}

      {tab === "router" && control.data && (
        <DataTable
          columns={[
            { key: "ctx", header: t("aiControlCenter.col.module"), render: (r) => r.context },
            { key: "user", header: "User", render: (r) => r.userId.slice(0, 8) },
            { key: "router", header: "Router", render: (r) => `${r.phases.routerMs} ms` },
            { key: "rag", header: "RAG", render: (r) => `${r.phases.ragMs} ms` },
            { key: "vector", header: "Vector", render: (r) => `${r.phases.vectorMs} ms` },
            { key: "tools", header: "Tools", render: (r) => `${r.phases.toolsMs} ms` },
            { key: "llm", header: "LLM", render: (r) => `${r.phases.llmMs} ms` },
            { key: "total", header: t("aiControlCenter.col.total"), render: (r) => `${r.phases.totalMs} ms` },
          ]}
          data={control.data.router}
          keyExtractor={(r) => r.id}
          emptyMessage="—"
        />
      )}

      {tab === "marketplace" && control.data && (() => {
        const d = control.data;
        const defaultTenantId = d.agents[0]?.tenantId;
        return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.marketplace.map((item) => (
            <div key={item.id} className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold text-rw-ink">{item.name}</h3>
                <HealthBadge status={item.installed ? "green" : "yellow"} />
              </div>
              <p className="mb-3 text-xs text-rw-muted">{item.description}</p>
              <p className="mb-3 text-xs text-rw-muted">
                {item.category} · {item.priceLabel}
              </p>
              {canMutate && defaultTenantId && (
                <button
                  type="button"
                  disabled={control.busy === "marketplace"}
                  className="rounded-lg bg-rw-accent px-3 py-1.5 text-xs text-white disabled:opacity-50"
                  onClick={() =>
                    control.marketplaceAction(
                      item.installed ? "uninstall" : "install",
                      item.id,
                      defaultTenantId,
                    )
                  }
                >
                  {item.installed ? t("aiControlCenter.uninstall") : t("aiControlCenter.install")}
                </button>
              )}
            </div>
          ))}
        </div>
        );
      })()}

      {tab === "benchmark" && control.data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-2">
            <Kpi label="RAG Hit Rate" value={`${Math.round(control.data.benchmark.ragHitRate * 100)}%`} />
            <Kpi label="Cache Hit" value={`${Math.round(control.data.benchmark.cacheHitRate * 100)}%`} />
            <Kpi label="Embedding Success" value={`${Math.round(control.data.benchmark.embeddingSuccessRate * 100)}%`} />
            <Kpi label="Tool Success" value={`${Math.round(control.data.benchmark.toolSuccessRate * 100)}%`} />
            <Kpi label="Streaming Success" value={`${Math.round(control.data.benchmark.streamingSuccessRate * 100)}%`} />
            <Kpi label="Error Rate" value={`${Math.round(control.data.benchmark.errorRate * 100)}%`} />
          </div>
          <div className="grid gap-2">
            {control.data.benchmark.dependencies.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-rw-line px-3 py-2">
                <span className="text-sm text-rw-ink">{d.label}</span>
                <HealthBadge status={d.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "audit" && control.data && (
        <DataTable
          columns={[
            { key: "op", header: t("aiControlCenter.col.operation"), render: (r) => r.operation },
            { key: "type", header: t("aiControlCenter.col.type"), render: (r) => r.entityType },
            { key: "actor", header: t("aiControlCenter.col.actor"), render: (r) => r.actorEmail ?? r.actorRole },
            {
              key: "at",
              header: t("aiControlCenter.col.when"),
              render: (r) => new Date(r.createdAt).toLocaleString("it-IT"),
            },
          ]}
          data={control.data.audit}
          keyExtractor={(r) => r.id}
          emptyMessage="—"
        />
      )}
    </div>
  );
}
