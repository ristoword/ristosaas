"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  FileUp,
  Loader2,
  PenLine,
  Save,
  Send,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { ALERT_INFO, BTN_GHOST, BTN_OUTLINE, BTN_PRIMARY, INPUT_CLASS, SELECT_CLASS } from "@/components/shared/ui-classes";
import {
  hotelGuestRegisterApi,
  type GuestRegisterAttachmentType,
  type GuestRegisterCountry,
  type GuestRegisterEntryDetail,
  type GuestRegisterPerson,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { tf } from "@/core/i18n/interpolate";
import { useI10n } from "@/core/i18n/formatters";
import { useI18n } from "@/core/i18n/provider";

type Props = { entryId: string };

const COUNTRY_CODES = ["IT", "NL", "BE", "DE", "FR", "ES"] as const satisfies readonly GuestRegisterCountry[];

export function GuestRegisterEntryPage({ entryId }: Props) {
  const { t } = useI18n();
  const { formatDateTime } = useI10n();
  const [detail, setDetail] = useState<GuestRegisterEntryDetail | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<GuestRegisterPerson>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [country, setCountry] = useState<GuestRegisterCountry>("IT");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sigRef = useRef<HTMLCanvasElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await hotelGuestRegisterApi.getEntry(entryId);
      setDetail(d);
      setCountry(d.transmissionCountry);
      const primary = d.persons.find((p) => p.isPrimary) ?? d.persons[0] ?? null;
      setSelectedPersonId(primary?.id ?? null);
      if (primary) setForm(primary);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.error"));
    } finally {
      setLoading(false);
    }
  }, [entryId, t]);

  useEffect(() => {
    void load();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [load]);

  const selectPerson = (p: GuestRegisterPerson) => {
    setSelectedPersonId(p.id);
    setForm(p);
  };

  const savePerson = async () => {
    if (!selectedPersonId) return;
    setBusy(true);
    try {
      const { person } = await hotelGuestRegisterApi.updatePerson(selectedPersonId, form);
      setForm(person);
      await load();
      setMsg(t("hotel.guestRegister.msg.saved"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.saveErr"));
    } finally {
      setBusy(false);
    }
  };

  const addGuest = async () => {
    setBusy(true);
    try {
      await hotelGuestRegisterApi.addPerson(entryId, { firstName: "", lastName: "", isPrimary: false });
      await load();
      setMsg(t("hotel.guestRegister.msg.guestAdded"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.error"));
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (file: File, type: GuestRegisterAttachmentType) => {
    if (!selectedPersonId) return;
    setBusy(true);
    try {
      const dataBase64 = await readFileAsDataUrl(file);
      await hotelGuestRegisterApi.uploadAttachment(selectedPersonId, {
        type,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        dataBase64,
      });
      if (type === "document_front" || type === "passport") {
        await hotelGuestRegisterApi.runOcr(selectedPersonId, {
          dataBase64,
          mimeType: file.type,
          fileName: file.name,
        });
      }
      await load();
      setMsg(t("hotel.guestRegister.msg.docUploaded"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.uploadErr"));
    } finally {
      setBusy(false);
    }
  };

  const applyOcr = async () => {
    if (!selectedPersonId) return;
    setBusy(true);
    try {
      const { person } = await hotelGuestRegisterApi.verifyOcr(selectedPersonId, true);
      setForm(person);
      await load();
      setMsg(t("hotel.guestRegister.msg.ocrApplied"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.ocrErr"));
    } finally {
      setBusy(false);
    }
  };

  const transmit = async () => {
    setBusy(true);
    try {
      await hotelGuestRegisterApi.updateEntry(entryId, { transmissionCountry: country });
      await hotelGuestRegisterApi.transmit(entryId, country);
      await load();
      setMsg(t("hotel.guestRegister.msg.transmitted"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("hotel.guestRegister.msg.transmitErr"));
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setMsg(t("hotel.guestRegister.msg.cameraErr"));
    }
  };

  const captureFromCamera = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
    await uploadFile(file, "document_front");
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  const saveSignature = async (type: GuestRegisterAttachmentType) => {
    if (!selectedPersonId || !sigRef.current) return;
    const dataUrl = sigRef.current.toDataURL("image/png");
    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `signature-${type}.png`, { type: "image/png" });
    await uploadFile(file, type);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-rw-muted" />
      </div>
    );
  }

  if (!detail) {
    return <p className="p-6 text-rw-muted">{t("hotel.guestRegister.entry.notFound")}</p>;
  }

  const personAttachments = detail.attachments.filter((a) => a.personId === selectedPersonId);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title={detail.guestName || t("hotel.guestRegister.entry.defaultTitle")}
        subtitle={tf(t, "hotel.guestRegister.entry.subtitle", {
          room: detail.roomCode || "—",
          arrival: detail.arrivalDate,
          departure: detail.departureDate,
          adults: detail.adults,
          children: detail.children,
        })}
      >
        <Link href="/hotel/guest-register" className={BTN_GHOST}>
          {t("hotel.guestRegister.entry.back")}
        </Link>
        <Link href="/hotel/folio" className={BTN_GHOST}>
          {t("hotel.guestRegister.entry.folio")}
        </Link>
        <Link href="/hotel/front-desk" className={BTN_GHOST}>
          {t("hotel.guestRegister.entry.frontDesk")}
        </Link>
      </PageHeader>

      {msg && <div className={ALERT_INFO}>{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-3">
          <Card title={t("hotel.guestRegister.entry.guests.title")}>
            <button type="button" disabled={busy} onClick={() => void addGuest()} className={cn(BTN_OUTLINE, "mb-3 w-full border-dashed py-2.5 text-sm text-rw-soft")}>
              <UserPlus className="h-4 w-4" /> {t("hotel.guestRegister.entry.guests.add")}
            </button>
            <ul className="space-y-2">
              {detail.persons.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPerson(p)}
                    className={cn(
                      "w-full rounded-xl border p-2 text-left text-sm",
                      selectedPersonId === p.id ? "border-rw-accent/50 bg-rw-accent/10" : "border-rw-line bg-rw-surfaceAlt",
                    )}
                  >
                    <p className="font-semibold text-rw-ink">{p.firstName} {p.lastName || "—"}</p>
                    <p className="text-[10px] text-rw-muted">{p.isComplete ? t("hotel.guestRegister.entry.person.complete") : t("hotel.guestRegister.entry.person.incomplete")} · {p.nationality || "—"}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("hotel.guestRegister.entry.transmission.title")}>
            <select className={cn(SELECT_CLASS, "mb-2")} value={country} onChange={(e) => setCountry(e.target.value as GuestRegisterCountry)}>
              {COUNTRY_CODES.map((code) => (
                <option key={code} value={code}>{t(`hotel.guestRegister.country.${code}`)}</option>
              ))}
            </select>
            <button type="button" disabled={busy} onClick={() => void transmit()} className={cn(BTN_PRIMARY, "w-full")}>
              <Send className="h-4 w-4" /> {t("hotel.guestRegister.entry.transmission.send")}
            </button>
            <p className="mt-2 text-[10px] text-rw-muted">{tf(t, "hotel.guestRegister.entry.transmission.status", { status: detail.transmissionStatus })}</p>
          </Card>
        </div>

        <div className="lg:col-span-9 space-y-4">
          <Card title={t("hotel.guestRegister.entry.form.title")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label={t("hotel.guestRegister.field.firstName")} value={form.firstName ?? ""} onChange={(v) => setForm({ ...form, firstName: v })} />
              <Field label={t("hotel.guestRegister.field.lastName")} value={form.lastName ?? ""} onChange={(v) => setForm({ ...form, lastName: v })} />
              <Field label={t("hotel.guestRegister.field.sex")} value={form.sex ?? "unknown"} onChange={(v) => setForm({ ...form, sex: v as GuestRegisterPerson["sex"] })} select options={["M", "F", "X", "unknown"]} />
              <Field label={t("hotel.guestRegister.field.dob")} value={form.dateOfBirth?.slice(0, 10) ?? ""} onChange={(v) => setForm({ ...form, dateOfBirth: v || null })} type="date" />
              <Field label={t("hotel.guestRegister.field.birthPlace")} value={form.placeOfBirth ?? ""} onChange={(v) => setForm({ ...form, placeOfBirth: v })} />
              <Field label={t("hotel.guestRegister.field.birthState")} value={form.stateOfBirth ?? ""} onChange={(v) => setForm({ ...form, stateOfBirth: v })} />
              <Field label={t("hotel.guestRegister.field.nationality")} value={form.nationality ?? ""} onChange={(v) => setForm({ ...form, nationality: v })} />
              <Field label={t("hotel.guestRegister.field.residence")} value={form.residenceCountry ?? ""} onChange={(v) => setForm({ ...form, residenceCountry: v })} />
              <Field label={t("hotel.guestRegister.field.address")} value={form.address ?? ""} onChange={(v) => setForm({ ...form, address: v })} />
              <Field label={t("hotel.guestRegister.field.postalCode")} value={form.postalCode ?? ""} onChange={(v) => setForm({ ...form, postalCode: v })} />
              <Field label={t("hotel.guestRegister.field.city")} value={form.city ?? ""} onChange={(v) => setForm({ ...form, city: v })} />
              <Field label={t("hotel.guestRegister.field.province")} value={form.province ?? ""} onChange={(v) => setForm({ ...form, province: v })} />
              <Field label={t("hotel.guestRegister.field.taxCode")} value={form.taxCode ?? ""} onChange={(v) => setForm({ ...form, taxCode: v })} />
              <Field label={t("hotel.guestRegister.field.phone")} value={form.phone ?? ""} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label={t("hotel.guestRegister.field.email")} value={form.email ?? ""} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label={t("hotel.guestRegister.field.docType")} value={form.documentType ?? ""} onChange={(v) => setForm({ ...form, documentType: (v || null) as GuestRegisterPerson["documentType"] })} select options={["passport", "identity_card", "driving_license", "visa", "other", ""]} />
              <Field label={t("hotel.guestRegister.field.docNumber")} value={form.documentNumber ?? ""} onChange={(v) => setForm({ ...form, documentNumber: v })} />
              <Field label={t("hotel.guestRegister.field.docIssue")} value={form.documentIssueDate?.slice(0, 10) ?? ""} onChange={(v) => setForm({ ...form, documentIssueDate: v || null })} type="date" />
              <Field label={t("hotel.guestRegister.field.docExpiry")} value={form.documentExpiryDate?.slice(0, 10) ?? ""} onChange={(v) => setForm({ ...form, documentExpiryDate: v || null })} type="date" />
              <Field label={t("hotel.guestRegister.field.docAuthority")} value={form.documentIssuingAuthority ?? ""} onChange={(v) => setForm({ ...form, documentIssuingAuthority: v })} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void savePerson()} className={BTN_PRIMARY}>
                <Save className="h-4 w-4" /> {t("hotel.guestRegister.entry.save")}
              </button>
              {form.ocrStatus === "completed" && (
                <button type="button" disabled={busy} onClick={() => void applyOcr()} className={BTN_OUTLINE}>
                  {t("hotel.guestRegister.entry.applyOcr")}
                </button>
              )}
            </div>
          </Card>

          <Card title={t("hotel.guestRegister.entry.documents.title")}>
            <div className="flex flex-wrap gap-2">
              <UploadBtn label={t("hotel.guestRegister.entry.upload.front")} onFile={(f) => void uploadFile(f, "document_front")} />
              <UploadBtn label={t("hotel.guestRegister.entry.upload.back")} onFile={(f) => void uploadFile(f, "document_back")} />
              <UploadBtn label={t("hotel.guestRegister.entry.upload.passport")} onFile={(f) => void uploadFile(f, "passport")} />
              <UploadBtn label={t("hotel.guestRegister.entry.upload.visa")} onFile={(f) => void uploadFile(f, "visa")} />
              <UploadBtn label={t("hotel.guestRegister.entry.upload.license")} onFile={(f) => void uploadFile(f, "driving_license")} />
              <button type="button" onClick={() => void (cameraOn ? captureFromCamera() : startCamera())} className={BTN_GHOST}>
                <Camera className="h-4 w-4" /> {cameraOn ? t("hotel.guestRegister.entry.camera.shoot") : t("hotel.guestRegister.entry.camera.webcam")}
              </button>
            </div>
            {cameraOn && (
              <div className="mt-3 space-y-2">
                <video ref={videoRef} className="max-h-64 w-full rounded-xl border border-rw-line" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            )}
            {personAttachments.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {personAttachments.map((a) => (
                  <li key={a.id} className="flex justify-between rounded-lg border border-rw-line px-3 py-2">
                    <span>{a.fileName} ({a.type})</span>
                    <a href={hotelGuestRegisterApi.attachmentUrl(a.id)} target="_blank" rel="noreferrer" className="text-rw-accent text-xs font-semibold">{t("hotel.guestRegister.entry.open")}</a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={t("hotel.guestRegister.entry.signature.title")}>
            <p className="mb-2 text-xs text-rw-muted">{t("hotel.guestRegister.entry.signature.hint")}</p>
            <SignaturePad canvasRef={sigRef} />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => void saveSignature("signature_privacy")} className={BTN_GHOST}>
                <PenLine className="h-4 w-4" /> {t("hotel.guestRegister.entry.sig.privacy")}
              </button>
              <button type="button" disabled={busy} onClick={() => void saveSignature("signature_checkin")} className={BTN_GHOST}>
                {t("hotel.guestRegister.entry.sig.checkin")}
              </button>
              <button type="button" disabled={busy} onClick={() => void saveSignature("signature_rules")} className={BTN_GHOST}>
                {t("hotel.guestRegister.entry.sig.rules")}
              </button>
            </div>
          </Card>

          <Card title={t("hotel.guestRegister.entry.audit.title")}>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-rw-muted">{t("hotel.guestRegister.entry.audit.label")}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {detail.auditLogs.slice(0, 20).map((a) => (
                    <li key={a.id} className="border-b border-rw-line/40 py-1">
                      {formatDateTime(a.createdAt)} — {a.action} ({a.userName || "—"})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-rw-muted">{t("hotel.guestRegister.entry.transmissions.label")}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {detail.transmissions.map((t) => (
                    <li key={t.id} className="border-b border-rw-line/40 py-1">
                      {t.country} · {t.status} · {t.externalRef || t.errorMessage || "—"}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  select,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  select?: boolean;
  options?: string[];
}) {
  return (
    <label className="block text-xs">
      <span className="text-rw-muted">{label}</span>
      {select ? (
        <select className={cn(SELECT_CLASS, "mt-1")} value={value} onChange={(e) => onChange(e.target.value)}>
          {options?.map((o) => (
            <option key={o} value={o}>{o || "—"}</option>
          ))}
        </select>
      ) : (
        <input type={type} className={cn(INPUT_CLASS, "mt-1")} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function UploadBtn({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  return (
    <label className={cn(BTN_GHOST, "cursor-pointer text-sm")}>
      <FileUp className="h-3.5 w-3.5" /> {label}
      <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </label>
  );
}

function SignaturePad({ canvasRef }: { canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 400;
    canvas.height = 120;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
    }
  }, [canvasRef]);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0]!.clientX - rect.left, y: e.touches[0]!.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    const p = pos(e);
    ctx?.lineTo(p.x, p.y);
    ctx?.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-md cursor-crosshair rounded-xl border border-rw-line touch-none"
      onMouseDown={start}
      onMouseMove={move}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchMove={move}
      onTouchEnd={end}
    />
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
