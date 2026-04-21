"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ChefHat, Settings, Sparkles, Store, User } from "lucide-react";
import { cn } from "@/lib/utils";

/** preview/mock page: onboarding wizard */

const inputCls = "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-4 py-3 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent focus:outline-none";
const labelCls = "block text-xs font-semibold text-rw-muted mb-1";

const STEPS = [
  { id: 1, label: "Ristorante", icon: Store },
  { id: 2, label: "Account Owner", icon: User },
  { id: 3, label: "Moduli", icon: Settings },
  { id: 4, label: "Completamento", icon: Check },
];

const MODULES = [
  { id: "sala", label: "Sala", desc: "Gestione tavoli e servizio" },
  { id: "cucina", label: "Cucina", desc: "KDS comande e ricette" },
  { id: "pizzeria", label: "Pizzeria", desc: "Stazione pizzeria" },
  { id: "bar", label: "Bar", desc: "Stazione bar e cocktail" },
  { id: "cassa", label: "Cassa", desc: "POS e pagamenti" },
  { id: "asporto", label: "Asporto", desc: "Ordini da asporto" },
  { id: "prenotazioni", label: "Prenotazioni", desc: "Agenda prenotazioni" },
  { id: "magazzino", label: "Magazzino", desc: "Inventario e scorte" },
  { id: "fornitori", label: "Fornitori", desc: "Anagrafica fornitori" },
  { id: "catering", label: "Catering", desc: "Eventi e banqueting" },
  { id: "staff", label: "Staff HR", desc: "Personale e turni" },
  { id: "supervisor", label: "Supervisor", desc: "Report e KPI" },
  { id: "qr", label: "QR Tavoli", desc: "Ordinazione QR" },
];

export function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tables, setTables] = useState(20);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPw, setOwnerPw] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(MODULES.map((m) => m.id));
  const [complete, setComplete] = useState(false);

  function toggleModule(id: string) {
    setSelectedModules((p) => p.includes(id) ? p.filter((m) => m !== id) : [...p, id]);
  }

  function handleComplete() {
    setComplete(true);
    setTimeout(() => { router.push("/dashboard"); }, 2000);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-rw-bg" style={{ background: "radial-gradient(circle at top left, #272a3b 0%, #050712 55%)" }}>
      <div className="w-full max-w-2xl space-y-6 px-6 py-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rw-accent/15 ring-1 ring-rw-accent/30"><ChefHat className="h-7 w-7 text-rw-accent" /></div>
          <h1 className="font-display text-2xl font-bold text-rw-ink">Setup RistoSimply</h1>
          <p className="mt-1 text-sm text-rw-muted">Configura il tuo ristorante in pochi passi</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center gap-2">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition", step >= s.id ? "bg-rw-accent text-white" : "bg-rw-surfaceAlt text-rw-muted ring-1 ring-rw-line")}>
                  {step > s.id ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {s.id < 4 && <div className={cn("h-0.5 w-8 rounded", step > s.id ? "bg-rw-accent" : "bg-rw-line")} />}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-rw-line bg-rw-surface p-6 shadow-xl">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-rw-ink">Informazioni ristorante</h2>
              <div><label className={labelCls}>Nome ristorante *</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. Trattoria Da Mario" className={inputCls} /></div>
              <div><label className={labelCls}>Indirizzo</label><input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Via Roma 1, Milano" className={inputCls} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Telefono</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 02 1234567" className={inputCls} /></div>
                <div><label className={labelCls}>Email</label><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@ristorante.it" className={inputCls} /></div>
              </div>
              <div><label className={labelCls}>Numero tavoli</label><input type="number" min={1} value={tables} onChange={(e) => setTables(Number(e.target.value))} className={inputCls} /></div>
              <button type="button" onClick={() => setStep(2)} disabled={!name.trim()} className="w-full rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white hover:bg-rw-accent/85 disabled:opacity-40 inline-flex items-center justify-center gap-2">Avanti <ArrowRight className="h-4 w-4" /></button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-rw-ink">Account Owner</h2>
              <div><label className={labelCls}>Nome completo *</label><input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nome e cognome" className={inputCls} /></div>
              <div><label className={labelCls}>Email *</label><input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="owner@ristorante.it" className={inputCls} /></div>
              <div><label className={labelCls}>Password *</label><input type="password" value={ownerPw} onChange={(e) => setOwnerPw(e.target.value)} placeholder="Minimo 6 caratteri" className={inputCls} /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 rounded-xl border border-rw-line px-5 py-3 text-sm font-semibold text-rw-soft hover:text-rw-ink">Indietro</button>
                <button type="button" onClick={() => setStep(3)} disabled={!ownerName.trim() || !ownerEmail.trim() || ownerPw.length < 6} className="flex-1 rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white hover:bg-rw-accent/85 disabled:opacity-40 inline-flex items-center justify-center gap-2">Avanti <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-rw-ink">Seleziona moduli</h2>
              <p className="text-xs text-rw-muted">Scegli quali moduli attivare. Potrai cambiare in qualsiasi momento.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {MODULES.map((m) => (
                  <button key={m.id} type="button" onClick={() => toggleModule(m.id)} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition", selectedModules.includes(m.id) ? "border-rw-accent bg-rw-accent/10" : "border-rw-line bg-rw-surfaceAlt hover:border-rw-accent/25")}>
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", selectedModules.includes(m.id) ? "bg-rw-accent text-white" : "bg-rw-surface text-rw-muted ring-1 ring-rw-line")}>{selectedModules.includes(m.id) ? <Check className="h-4 w-4" /> : <Settings className="h-4 w-4" />}</div>
                    <div><p className="text-sm font-semibold text-rw-ink">{m.label}</p><p className="text-xs text-rw-muted">{m.desc}</p></div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 rounded-xl border border-rw-line px-5 py-3 text-sm font-semibold text-rw-soft hover:text-rw-ink">Indietro</button>
                <button type="button" onClick={() => setStep(4)} className="flex-1 rounded-xl bg-rw-accent px-5 py-3 text-sm font-bold text-white hover:bg-rw-accent/85 inline-flex items-center justify-center gap-2">Avanti <ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 text-center">
              {!complete ? (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30"><Sparkles className="h-8 w-8 text-emerald-400" /></div>
                  <h2 className="text-lg font-semibold text-rw-ink">Tutto pronto!</h2>
                  <div className="text-left rounded-xl border border-rw-line bg-rw-surfaceAlt p-4 space-y-1 text-sm text-rw-soft">
                    <p><span className="font-semibold text-rw-ink">Ristorante:</span> {name}</p>
                    <p><span className="font-semibold text-rw-ink">Owner:</span> {ownerName} ({ownerEmail})</p>
                    <p><span className="font-semibold text-rw-ink">Moduli attivi:</span> {selectedModules.length}</p>
                    <p><span className="font-semibold text-rw-ink">Tavoli:</span> {tables}</p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(3)} className="flex-1 rounded-xl border border-rw-line px-5 py-3 text-sm font-semibold text-rw-soft hover:text-rw-ink">Indietro</button>
                    <button type="button" onClick={handleComplete} className="flex-1 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-500/85">Completa setup</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15"><Check className="h-8 w-8 text-emerald-400" /></div>
                  <h2 className="text-lg font-semibold text-emerald-400">Setup completato!</h2>
                  <p className="text-sm text-rw-muted">Reindirizzamento alla dashboard…</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
