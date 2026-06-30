"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Calendar,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Chip } from "@/components/shared/chip";
import { TabBar } from "@/components/shared/tab-bar";
import { DataTable } from "@/components/shared/data-table";
import {
  candidatiApi,
  type HrCandidate,
  type HrCandidateSource,
  type HrCandidateStatus,
} from "@/lib/api-client";
import {
  CANDIDATE_JOB_ROLES,
  CANDIDATE_SOURCE_LABELS,
  CANDIDATE_STATUS_LABELS,
  prepareCvUpload,
  roleLabel,
} from "@/lib/hr/candidate-utils";
import { todayIso } from "@/lib/date-utils";

const CARD =
  "rounded-2xl border border-rw-line bg-gradient-to-b from-rw-surface to-rw-surfaceAlt/80 shadow-sm";
const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30";
const LABEL = "block text-xs font-bold uppercase tracking-wide text-rw-muted mb-1.5";
const BTN_PRIMARY =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-rw-accent px-4 text-sm font-semibold text-white transition hover:bg-rw-accent/90 disabled:opacity-50";

const STATUS_OPTIONS: HrCandidateStatus[] = [
  "new",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
  "archived",
];

const STATUS_COLORS: Record<HrCandidateStatus, string> = {
  new: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  screening: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  interview: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  offer: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  hired: "bg-emerald-600/20 text-emerald-300 border-emerald-500/40",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

const SOURCE_COLORS: Record<HrCandidateSource, string> = {
  manual: "bg-rw-accent/10 text-rw-accentSoft border-rw-accent/25",
  email: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  paper: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

type ImportTab = "database" | "manual" | "email" | "paper";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
  experienceYears: string;
  roles: string[];
  presentedAt: string;
  notes: string;
  status: HrCandidateStatus;
  sourceEmailFrom: string;
  sourceEmailSubject: string;
  sourceEmailBody: string;
};

function emptyForm(source: HrCandidateSource): FormState {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    experienceYears: "",
    roles: [],
    presentedAt: todayIso(),
    notes: "",
    status: "new",
    sourceEmailFrom: "",
    sourceEmailSubject: "",
    sourceEmailBody: "",
  };
}

function candidateToForm(c: HrCandidate): FormState {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    age: c.age != null ? String(c.age) : "",
    experienceYears: c.experienceYears != null ? String(c.experienceYears) : "",
    roles: c.roles,
    presentedAt: c.presentedAt,
    notes: c.notes,
    status: c.status,
    sourceEmailFrom: c.sourceEmailFrom,
    sourceEmailSubject: c.sourceEmailSubject,
    sourceEmailBody: c.sourceEmailBody,
  };
}

export function CandidatiPage() {
  const [candidates, setCandidates] = useState<HrCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<ImportTab>("database");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [form, setForm] = useState<FormState>(() => emptyForm("manual"));
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedId) ?? null,
    [candidates, selectedId],
  );

  const fetchCandidates = useCallback(async () => {
    try {
      const data = await candidatiApi.list();
      setCandidates(data);
    } catch {
      setFlash("Errore caricamento candidati");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    if (selected) setForm(candidateToForm(selected));
  }, [selected]);

  const stats = useMemo(() => {
    const nuovi = candidates.filter((c) => c.status === "new").length;
    const pipeline = candidates.filter((c) =>
      ["screening", "interview", "offer"].includes(c.status),
    ).length;
    const conCv = candidates.filter((c) => c.attachmentCount > 0).length;
    const daEmail = candidates.filter((c) => c.source === "email").length;
    return { total: candidates.length, nuovi, pipeline, conCv, daEmail };
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      if (filterSource !== "all" && c.source !== filterSource) return false;
      if (!q) return true;
      const hay = [
        c.fullName,
        c.email,
        c.phone,
        c.notes,
        c.sourceEmailFrom,
        c.roles.map(roleLabel).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, search, filterStatus, filterSource]);

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3500);
  }

  function startNew(source: HrCandidateSource) {
    setSelectedId(null);
    setForm(emptyForm(source));
    setPendingFile(null);
    setPreviewUrl(null);
    setTab(source === "email" ? "email" : source === "paper" ? "paper" : "manual");
  }

  function selectCandidate(c: HrCandidate) {
    setSelectedId(c.id);
    setTab("database");
    setPendingFile(null);
    setPreviewUrl(null);
  }

  async function uploadFileForCandidate(candidateId: string, file: File) {
    const { base64, mimeType } = await prepareCvUpload(file);
    await candidatiApi.uploadAttachment(candidateId, {
      fileName: file.name,
      mimeType,
      dataBase64: base64,
    });
  }

  async function handleSave(source: HrCandidateSource) {
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        age: form.age ? parseInt(form.age, 10) : null,
        experienceYears: form.experienceYears ? parseInt(form.experienceYears, 10) : null,
        roles: form.roles,
        presentedAt: form.presentedAt,
        notes: form.notes.trim(),
        status: form.status,
        source,
        sourceEmailFrom: form.sourceEmailFrom.trim(),
        sourceEmailSubject: form.sourceEmailSubject.trim(),
        sourceEmailBody: form.sourceEmailBody.trim(),
      };

      let saved: HrCandidate;
      if (selectedId) {
        saved = await candidatiApi.update(selectedId, payload);
        if (pendingFile) await uploadFileForCandidate(saved.id, pendingFile);
        showFlash("Candidato aggiornato");
      } else {
        saved = await candidatiApi.create(payload);
        if (pendingFile) await uploadFileForCandidate(saved.id, pendingFile);
        showFlash("Candidato registrato");
      }

      await fetchCandidates();
      setSelectedId(saved.id);
      setPendingFile(null);
      setPreviewUrl(null);
      setTab("database");
    } catch (e) {
      showFlash(e instanceof Error ? e.message : "Errore salvataggio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Eliminare questo candidato e tutti gli allegati?")) return;
    try {
      await candidatiApi.delete(id);
      if (selectedId === id) setSelectedId(null);
      await fetchCandidates();
      showFlash("Candidato eliminato");
    } catch {
      showFlash("Errore eliminazione");
    }
  }

  async function handlePreviewAttachment(candidateId: string, attachmentId: string) {
    try {
      const att = await candidatiApi.getAttachment(candidateId, attachmentId);
      setPreviewUrl(att.dataUrl);
    } catch {
      showFlash("Impossibile aprire l'allegato");
    }
  }

  async function handleDownloadAttachment(candidateId: string, attachmentId: string, fileName: string) {
    try {
      const att = await candidatiApi.getAttachment(candidateId, attachmentId);
      const a = document.createElement("a");
      a.href = att.dataUrl;
      a.download = fileName;
      a.click();
    } catch {
      showFlash("Download non riuscito");
    }
  }

  function onFilePick(file: File | null) {
    setPendingFile(file);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  const roleGroups = useMemo(() => {
    const groups = new Map<string, Array<(typeof CANDIDATE_JOB_ROLES)[number]>>();
    for (const r of CANDIDATE_JOB_ROLES) {
      if (!groups.has(r.group)) groups.set(r.group, []);
      groups.get(r.group)!.push(r);
    }
    return [...groups.entries()];
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Candidati CV"
        subtitle="Database recruiting: curriculum da email, cartacei o inserimento manuale. Contatta il personale quando serve assumere."
      >
        <Chip label="Candidati" value={stats.total} />
        <Chip label="Nuovi" value={stats.nuovi} tone="info" />
        <Chip label="Pipeline" value={stats.pipeline} tone="accent" />
        <Chip label="Con CV" value={stats.conCv} tone="success" />
      </PageHeader>

      {flash ? (
        <p className="rounded-xl border border-rw-accent/30 bg-rw-accent/10 px-4 py-2 text-sm font-medium text-rw-accentSoft">
          {flash}
        </p>
      ) : null}

      <TabBar
        tabs={[
          { id: "database", label: "Database" },
          { id: "manual", label: "Inserimento manuale" },
          { id: "email", label: "Da email" },
          { id: "paper", label: "CV cartaceo" },
        ]}
        active={tab}
        onChange={(id) => {
          const next = id as ImportTab;
          setTab(next);
          if (next === "manual") startNew("manual");
          if (next === "email") startNew("email");
          if (next === "paper") startNew("paper");
        }}
      />

      {tab === "database" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className={cn(CARD, "p-4")}>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rw-muted" />
                <input
                  className={cn(INPUT, "pl-9")}
                  placeholder="Cerca per nome, email, ruolo, note…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className={cn(INPUT, "sm:w-40")}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tutti gli stati</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {CANDIDATE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                className={cn(INPUT, "sm:w-36")}
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
              >
                <option value="all">Tutte le fonti</option>
                <option value="manual">Manuale</option>
                <option value="email">Email</option>
                <option value="paper">Cartaceo</option>
              </select>
              <button type="button" className={BTN_PRIMARY} onClick={() => startNew("manual")}>
                <Plus className="h-4 w-4" />
                Nuovo
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-rw-muted">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Caricamento…
              </div>
            ) : (
              <DataTable
                data={filtered}
                keyExtractor={(c) => c.id}
                onRowClick={selectCandidate}
                selectedKey={selectedId}
                columns={[
                  {
                    key: "name",
                    header: "Candidato",
                    render: (c) => (
                      <div>
                        <p className="font-semibold text-rw-ink">{c.fullName}</p>
                        <p className="text-xs text-rw-muted">{c.email || c.phone || "—"}</p>
                      </div>
                    ),
                  },
                  {
                    key: "roles",
                    header: "Ruoli",
                    render: (c) => (
                      <div className="flex flex-wrap gap-1">
                        {c.roles.slice(0, 2).map((r) => (
                          <span
                            key={r}
                            className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2 py-0.5 text-[10px] font-semibold text-rw-muted"
                          >
                            {roleLabel(r)}
                          </span>
                        ))}
                        {c.roles.length > 2 ? (
                          <span className="text-[10px] text-rw-muted">+{c.roles.length - 2}</span>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "exp",
                    header: "Esperienza",
                    render: (c) => (
                      <span className="tabular-nums text-sm text-rw-ink">
                        {c.experienceYears != null ? `${c.experienceYears} anni` : "—"}
                        {c.age != null ? ` · ${c.age} anni` : ""}
                      </span>
                    ),
                  },
                  {
                    key: "presented",
                    header: "Presentazione",
                    render: (c) => (
                      <span className="text-sm tabular-nums text-rw-muted">{c.presentedAt}</span>
                    ),
                  },
                  {
                    key: "source",
                    header: "Fonte",
                    render: (c) => (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                          SOURCE_COLORS[c.source],
                        )}
                      >
                        {CANDIDATE_SOURCE_LABELS[c.source]}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    header: "Stato",
                    render: (c) => (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold",
                          STATUS_COLORS[c.status],
                        )}
                      >
                        {CANDIDATE_STATUS_LABELS[c.status]}
                      </span>
                    ),
                  },
                  {
                    key: "cv",
                    header: "CV",
                    render: (c) => (
                      <span className="text-xs font-semibold text-rw-muted">
                        {c.attachmentCount > 0 ? `${c.attachmentCount} file` : "—"}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </div>

          <aside className={cn(CARD, "p-4 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto")}>
            {selected ? (
              <CandidateDetail
                candidate={selected}
                onStatusChange={async (status) => {
                  await candidatiApi.update(selected.id, { status });
                  await fetchCandidates();
                }}
                onPreview={handlePreviewAttachment}
                onDownload={handleDownloadAttachment}
                onDelete={() => handleDelete(selected.id)}
                onEdit={() => {
                  setForm(candidateToForm(selected));
                  setTab(selected.source === "email" ? "email" : selected.source === "paper" ? "paper" : "manual");
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-rw-muted">
                <Users className="mb-3 h-10 w-10 opacity-40" />
                <p className="text-sm">Seleziona un candidato dalla lista</p>
                <p className="mt-1 text-xs">oppure aggiungine uno nuovo</p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <CandidateForm
          mode={tab}
          form={form}
          setForm={setForm}
          roleGroups={roleGroups}
          saving={saving}
          pendingFile={pendingFile}
          previewUrl={previewUrl}
          fileRef={fileRef}
          onFilePick={onFilePick}
          onSave={() =>
            handleSave(tab === "email" ? "email" : tab === "paper" ? "paper" : "manual")
          }
          isEdit={Boolean(selectedId)}
        />
      )}

      {previewUrl && tab === "database" ? (
        <div className={cn(CARD, "fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl p-4 md:inset-x-auto md:right-8 md:top-24 md:bottom-auto")}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-rw-ink">Anteprima CV</p>
            <button
              type="button"
              className="text-xs text-rw-muted hover:text-rw-ink"
              onClick={() => setPreviewUrl(null)}
            >
              Chiudi
            </button>
          </div>
          {previewUrl.startsWith("data:application/pdf") ? (
            <iframe src={previewUrl} className="h-[60vh] w-full rounded-xl border border-rw-line" title="CV PDF" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Anteprima CV" className="max-h-[60vh] w-full rounded-xl border border-rw-line object-contain" />
          )}
        </div>
      ) : null}
    </div>
  );
}

function CandidateForm({
  mode,
  form,
  setForm,
  roleGroups,
  saving,
  pendingFile,
  previewUrl,
  fileRef,
  onFilePick,
  onSave,
  isEdit,
}: {
  mode: ImportTab;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  roleGroups: [string, Array<(typeof CANDIDATE_JOB_ROLES)[number]>][];
  saving: boolean;
  pendingFile: File | null;
  previewUrl: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFilePick: (file: File | null) => void;
  onSave: () => void;
  isEdit: boolean;
}) {
  const title =
    mode === "email"
      ? "Registra candidato da email"
      : mode === "paper"
        ? "Scansiona CV cartaceo"
        : "Inserimento manuale candidato";

  const subtitle =
    mode === "email"
      ? "Inserisci i dati dell'email ricevuta e allega il CV in PDF o immagine."
      : mode === "paper"
        ? "Carica foto o scan del curriculum consegnato a mano."
        : "Compila la scheda candidato per il database recruiting.";

  function toggleRole(value: string) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(value)
        ? f.roles.filter((r) => r !== value)
        : [...f.roles, value],
    }));
  }

  return (
    <div className={cn(CARD, "p-5 md:p-6")}>
      <div className="mb-6 flex items-start gap-3">
        {mode === "email" ? (
          <Mail className="mt-1 h-6 w-6 text-sky-400" />
        ) : mode === "paper" ? (
          <FileText className="mt-1 h-6 w-6 text-orange-400" />
        ) : (
          <UserPlus className="mt-1 h-6 w-6 text-rw-accent" />
        )}
        <div>
          <h2 className="font-display text-xl font-bold text-rw-ink">{title}</h2>
          <p className="mt-1 text-sm text-rw-muted">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {mode === "email" ? (
            <div className="space-y-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-sky-400">Dati email</p>
              <div>
                <label className={LABEL}>Email mittente</label>
                <input
                  className={INPUT}
                  type="email"
                  value={form.sourceEmailFrom}
                  onChange={(e) => setForm((f) => ({ ...f, sourceEmailFrom: e.target.value, email: f.email || e.target.value }))}
                  placeholder="candidato@email.com"
                />
              </div>
              <div>
                <label className={LABEL}>Oggetto email</label>
                <input
                  className={INPUT}
                  value={form.sourceEmailSubject}
                  onChange={(e) => setForm((f) => ({ ...f, sourceEmailSubject: e.target.value }))}
                  placeholder="Candidatura per posizione sala"
                />
              </div>
              <div>
                <label className={LABEL}>Estratto / corpo email</label>
                <textarea
                  className={cn(INPUT, "min-h-[100px] resize-y")}
                  value={form.sourceEmailBody}
                  onChange={(e) => setForm((f) => ({ ...f, sourceEmailBody: e.target.value }))}
                  placeholder="Testo dell'email ricevuta…"
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Nome</label>
              <input
                className={INPUT}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL}>Cognome</label>
              <input
                className={INPUT}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Email contatto</label>
              <input
                className={INPUT}
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL}>Telefono</label>
              <input
                className={INPUT}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={LABEL}>Età</label>
              <input
                className={INPUT}
                type="number"
                min={16}
                max={80}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL}>Anni esperienza</label>
              <input
                className={INPUT}
                type="number"
                min={0}
                max={50}
                value={form.experienceYears}
                onChange={(e) => setForm((f) => ({ ...f, experienceYears: e.target.value }))}
              />
            </div>
            <div>
              <label className={LABEL}>Data presentazione</label>
              <input
                className={INPUT}
                type="date"
                value={form.presentedAt}
                onChange={(e) => setForm((f) => ({ ...f, presentedAt: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>Ruoli richiesti</label>
            <div className="max-h-48 space-y-3 overflow-y-auto rounded-xl border border-rw-line bg-rw-surfaceAlt/50 p-3">
              {roleGroups.map(([group, roles]) => (
                <div key={group}>
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-rw-muted">{group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => toggleRole(r.value)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                          form.roles.includes(r.value)
                            ? "border-rw-accent bg-rw-accent/15 text-rw-accentSoft"
                            : "border-rw-line text-rw-muted hover:border-rw-accent/30",
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Note</label>
            <textarea
              className={cn(INPUT, "min-h-[80px] resize-y")}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Disponibilità, referenze, colloqui…"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-dashed border-rw-line bg-rw-surfaceAlt/40 p-5 text-center">
            <Upload className="mx-auto mb-2 h-8 w-8 text-rw-muted" />
            <p className="text-sm font-semibold text-rw-ink">
              {mode === "paper" ? "Foto o scan del CV" : "Allega CV (PDF, JPG, PNG)"}
            </p>
            <p className="mt-1 text-xs text-rw-muted">Max 4 MB · PDF e immagini</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => onFilePick(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="mt-4 rounded-xl border border-rw-line bg-rw-surface px-4 py-2 text-sm font-semibold text-rw-ink hover:border-rw-accent/40"
              onClick={() => fileRef.current?.click()}
            >
              Scegli file
            </button>
            {pendingFile ? (
              <p className="mt-3 text-xs font-medium text-rw-accentSoft">{pendingFile.name}</p>
            ) : null}
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Anteprima"
                className="mx-auto mt-4 max-h-48 rounded-lg border border-rw-line object-contain"
              />
            ) : null}
          </div>

          {isEdit ? (
            <div>
              <label className={LABEL}>Stato pipeline</label>
              <select
                className={INPUT}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value as HrCandidateStatus }))
                }
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {CANDIDATE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <button type="button" className={cn(BTN_PRIMARY, "w-full")} disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isEdit ? "Salva modifiche" : "Registra candidato"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateDetail({
  candidate,
  onStatusChange,
  onPreview,
  onDownload,
  onDelete,
  onEdit,
}: {
  candidate: HrCandidate;
  onStatusChange: (status: HrCandidateStatus) => Promise<void>;
  onPreview: (candidateId: string, attachmentId: string) => void;
  onDownload: (candidateId: string, attachmentId: string, fileName: string) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg font-bold text-rw-ink">{candidate.fullName}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", STATUS_COLORS[candidate.status])}>
            {CANDIDATE_STATUS_LABELS[candidate.status]}
          </span>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold", SOURCE_COLORS[candidate.source])}>
            {CANDIDATE_SOURCE_LABELS[candidate.source]}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Info icon={Calendar} label="Presentazione" value={candidate.presentedAt} />
        <Info icon={Briefcase} label="Esperienza" value={candidate.experienceYears != null ? `${candidate.experienceYears} anni` : "—"} />
        <Info icon={Users} label="Età" value={candidate.age != null ? `${candidate.age} anni` : "—"} />
        <Info icon={FileText} label="CV" value={candidate.attachmentCount > 0 ? `${candidate.attachmentCount} file` : "Nessuno"} />
      </div>

      {candidate.roles.length > 0 ? (
        <div>
          <p className={LABEL}>Ruoli</p>
          <div className="flex flex-wrap gap-1">
            {candidate.roles.map((r) => (
              <span key={r} className="rounded-full border border-rw-line bg-rw-surfaceAlt px-2 py-0.5 text-[10px] font-semibold text-rw-ink">
                {roleLabel(r)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {candidate.email ? (
          <a href={`mailto:${candidate.email}`} className="flex items-center gap-2 text-sm text-rw-accentSoft hover:underline">
            <Mail className="h-4 w-4" />
            {candidate.email}
          </a>
        ) : null}
        {candidate.phone ? (
          <a href={`tel:${candidate.phone}`} className="flex items-center gap-2 text-sm text-rw-accentSoft hover:underline">
            <Phone className="h-4 w-4" />
            {candidate.phone}
          </a>
        ) : null}
      </div>

      {candidate.source === "email" && candidate.sourceEmailSubject ? (
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-xs">
          <p className="font-bold text-sky-400">Email: {candidate.sourceEmailSubject}</p>
          {candidate.sourceEmailFrom ? <p className="mt-1 text-rw-muted">Da: {candidate.sourceEmailFrom}</p> : null}
          {candidate.sourceEmailBody ? (
            <p className="mt-2 line-clamp-4 text-rw-muted">{candidate.sourceEmailBody}</p>
          ) : null}
        </div>
      ) : null}

      {candidate.notes ? (
        <div>
          <p className={LABEL}>Note</p>
          <p className="text-sm text-rw-muted">{candidate.notes}</p>
        </div>
      ) : null}

      <div>
        <label className={LABEL}>Stato pipeline</label>
        <select
          className={INPUT}
          value={candidate.status}
          onChange={(e) => void onStatusChange(e.target.value as HrCandidateStatus)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {CANDIDATE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {candidate.attachments.length > 0 ? (
        <div>
          <p className={LABEL}>Allegati CV</p>
          <ul className="space-y-2">
            {candidate.attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2"
              >
                <span className="min-w-0 truncate text-xs font-medium text-rw-ink">{att.fileName}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="rounded-lg border border-rw-line px-2 py-1 text-[10px] font-semibold text-rw-muted hover:text-rw-ink"
                    onClick={() => onPreview(candidate.id, att.id)}
                  >
                    Apri
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-rw-line p-1 text-rw-muted hover:text-rw-ink"
                    onClick={() => onDownload(candidate.id, att.id, att.fileName)}
                    aria-label="Scarica"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-2 pt-2">
        <button type="button" className={cn(BTN_PRIMARY, "flex-1")} onClick={onEdit}>
          Modifica
        </button>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-red-500/30 px-3 text-red-400 hover:bg-red-500/10"
          onClick={onDelete}
          aria-label="Elimina"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-rw-line/50 bg-rw-surfaceAlt/50 px-2 py-1.5">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-rw-muted">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-rw-ink">{value}</p>
    </div>
  );
}
