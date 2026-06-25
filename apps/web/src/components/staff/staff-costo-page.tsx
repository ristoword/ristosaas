"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Calculator,
  DollarSign,
  Percent,
  PiggyBank,
  Save,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/shared/card";
import { Chip } from "@/components/shared/chip";
import { useI18n } from "@/core/i18n/provider";

const INPUT =
  "w-full rounded-xl border border-rw-line bg-rw-surfaceAlt px-3 py-2.5 text-sm text-rw-ink placeholder:text-rw-muted focus:border-rw-accent/50 focus:outline-none focus:ring-1 focus:ring-rw-accent/30 tabular-nums";
const LABEL = "block text-xs font-semibold text-rw-muted mb-1";

/* ── CCNL presets ─────────────────────────────── */
type CcnlPreset = {
  id: string;
  label: string;
  inpsEmployee: number;
  inpsEmployer: number;
  inailRate: number;
  irapRate: number;
  mensilita: 13 | 14;
  description: string;
};

const CCNL_PRESETS: CcnlPreset[] = [
  { id: "turismo", label: "Turismo / Pubblici Esercizi", inpsEmployee: 9.19, inpsEmployer: 29.56, inailRate: 1.2, irapRate: 3.9, mensilita: 14, description: "CCNL Turismo — Pubblici esercizi, hotel, ristoranti, bar" },
  { id: "commercio", label: "Commercio / Terziario", inpsEmployee: 9.19, inpsEmployer: 28.98, inailRate: 0.5, irapRate: 3.9, mensilita: 14, description: "CCNL Commercio e Terziario — Confcommercio" },
  { id: "artigiani_alimentaristi", label: "Artigiani Alimentaristi", inpsEmployee: 9.19, inpsEmployer: 28.20, inailRate: 1.5, irapRate: 3.9, mensilita: 14, description: "CCNL Artigiani del settore alimentare" },
  { id: "custom", label: "Personalizzato", inpsEmployee: 9.19, inpsEmployer: 29.56, inailRate: 1.2, irapRate: 3.9, mensilita: 13, description: "Parametri personalizzabili" },
];

/* ── IRPEF 2024–2026 scaglioni ────────────────── */
const IRPEF_BRACKETS: { upto: number; rate: number }[] = [
  { upto: 28_000, rate: 0.23 },
  { upto: 50_000, rate: 0.35 },
  { upto: Infinity, rate: 0.43 },
];

function calcIrpefLorda(imponibile: number): number {
  let tax = 0;
  let prev = 0;
  for (const b of IRPEF_BRACKETS) {
    const slice = Math.min(imponibile, b.upto) - prev;
    if (slice <= 0) break;
    tax += slice * b.rate;
    prev = b.upto;
  }
  return tax;
}

/* Detrazioni da lavoro dipendente (2024+) */
function calcDetrazioneLavoroDipendente(reddito: number): number {
  if (reddito <= 15_000) return Math.min(1_955, 1_880 + (1_955 - 1_880) * (15_000 - reddito) / 15_000);
  if (reddito <= 28_000) return 1_910 + 1_190 * (28_000 - reddito) / 13_000;
  if (reddito <= 50_000) return 1_910 * (50_000 - reddito) / 22_000;
  return 0;
}

/* Addizionali regionali/comunali (medie) */
const DEFAULT_ADDIZIONALE_REGIONALE = 1.73;
const DEFAULT_ADDIZIONALE_COMUNALE = 0.8;

export function StaffCostoPage() {
  const { t } = useI18n();

  const [ccnlId, setCcnlId] = useState("turismo");
  const ccnl = CCNL_PRESETS.find((p) => p.id === ccnlId) ?? CCNL_PRESETS[0];

  /* ── Dati retribuzione ─────────────────────── */
  const [ral, setRal] = useState(22_000);
  const [mensilita, setMensilita] = useState<13 | 14>(ccnl.mensilita);
  const [oreLav, setOreLav] = useState(40);
  const [settimane, setSettimane] = useState(52);

  /* ── Contributi e aliquote ─────────────────── */
  const [inpsEmployee, setInpsEmployee] = useState(ccnl.inpsEmployee);
  const [inpsEmployer, setInpsEmployer] = useState(ccnl.inpsEmployer);
  const [inailRate, setInailRate] = useState(ccnl.inailRate);
  const [irapRate, setIrapRate] = useState(ccnl.irapRate);

  /* ── Addizionali ───────────────────────────── */
  const [addRegionale, setAddRegionale] = useState(DEFAULT_ADDIZIONALE_REGIONALE);
  const [addComunale, setAddComunale] = useState(DEFAULT_ADDIZIONALE_COMUNALE);

  /* ── Benefit e voci aggiuntive ─────────────── */
  const [buoniPasto, setBuoniPasto] = useState(0);
  const [giorniLavMese, setGiorniLavMese] = useState(22);
  const [ferieGiorni, setFerieGiorni] = useState(26);
  const [exFestivita, setExFestivita] = useState(4);
  const [rol, setRol] = useState(72);
  const [giorniMalattia, setGiorniMalattia] = useState(0);
  const [assicurazioneExtra, setAssicurazioneExtra] = useState(0);
  const [fondoPensione, setFondoPensione] = useState(0);
  const [fondiSanitari, setFondiSanitari] = useState(0);
  const [altriCosti, setAltriCosti] = useState(0);

  /* ── Detrazioni fiscali ────────────────────── */
  const [coniugeCarico, setConiugeCarico] = useState(false);
  const [figliCarico, setFigliCarico] = useState(0);

  const applyCcnl = useCallback((id: string) => {
    setCcnlId(id);
    const p = CCNL_PRESETS.find((x) => x.id === id) ?? CCNL_PRESETS[0];
    setInpsEmployee(p.inpsEmployee);
    setInpsEmployer(p.inpsEmployer);
    setInailRate(p.inailRate);
    setIrapRate(p.irapRate);
    setMensilita(p.mensilita);
  }, []);

  /* ── CALCOLI ───────────────────────────────── */
  const calc = useMemo(() => {
    const ralAnnuo = ral;
    const mensilitaNum = mensilita;
    const stipendioLordoMensile = ralAnnuo / mensilitaNum;

    // INPS dipendente
    const inpsDipAnnuo = ralAnnuo * (inpsEmployee / 100);
    const inpsDipMensile = inpsDipAnnuo / mensilitaNum;

    // Imponibile IRPEF = RAL - INPS dipendente
    const imponibileIrpef = ralAnnuo - inpsDipAnnuo;

    // IRPEF lorda
    const irpefLorda = calcIrpefLorda(imponibileIrpef);

    // Detrazioni
    let detrazioni = calcDetrazioneLavoroDipendente(ralAnnuo);
    if (coniugeCarico && ralAnnuo <= 80_000) detrazioni += 800;
    detrazioni += figliCarico * 950;

    // IRPEF netta
    const irpefNetta = Math.max(0, irpefLorda - detrazioni);
    const irpefMensile = irpefNetta / mensilitaNum;

    // Addizionali regionali e comunali
    const addRegAnnua = imponibileIrpef * (addRegionale / 100);
    const addComAnnua = imponibileIrpef * (addComunale / 100);
    const addTotAnnua = addRegAnnua + addComAnnua;
    const addMensile = addTotAnnua / 12;

    // Netto annuo dipendente
    const nettoAnnuo = ralAnnuo - inpsDipAnnuo - irpefNetta - addTotAnnua;
    const nettoMensile = nettoAnnuo / mensilitaNum;

    // ─── COSTI DATORE DI LAVORO ─────────────
    // INPS datore
    const inpsDatoreAnnuo = ralAnnuo * (inpsEmployer / 100);
    const inpsDatoreMensile = inpsDatoreAnnuo / 12;

    // INAIL
    const inailAnnuo = ralAnnuo * (inailRate / 100);
    const inailMensile = inailAnnuo / 12;

    // IRAP (sul costo del lavoro)
    const baseIrap = ralAnnuo + inpsDatoreAnnuo;
    const irapAnnuo = baseIrap * (irapRate / 100);
    const irapMensile = irapAnnuo / 12;

    // TFR (Trattamento Fine Rapporto)
    const tfrAnnuo = ralAnnuo / 13.5;
    const tfrMensile = tfrAnnuo / 12;

    // Ferie e permessi (costo opportunità per il datore)
    const costoGiornaliero = ralAnnuo / (settimane * 5);
    const costoFerie = ferieGiorni * costoGiornaliero;
    const costoExFestivita = exFestivita * costoGiornaliero;
    const costoRol = (rol / 8) * costoGiornaliero;
    const costoFeriePermessiTotale = costoFerie + costoExFestivita + costoRol;

    // Malattia (costo residuo datore oltre INPS)
    const costoMalattia = giorniMalattia * costoGiornaliero * 0.5;

    // Buoni pasto
    const buoniPastoAnnuo = buoniPasto * giorniLavMese * 12;

    // Fondi sanitari e pensione complementare
    const fondiTotaliAnnuo = fondoPensione + fondiSanitari;
    const fondiTotaliMensile = fondiTotaliAnnuo / 12;

    // Assicurazione extra
    const assicurazioneAnnua = assicurazioneExtra;

    // Costo totale annuo datore
    const costoTotaleAnnuo =
      ralAnnuo +
      inpsDatoreAnnuo +
      inailAnnuo +
      irapAnnuo +
      tfrAnnuo +
      buoniPastoAnnuo +
      fondiTotaliAnnuo +
      assicurazioneAnnua +
      costoMalattia +
      altriCosti;

    const costoTotaleMensile = costoTotaleAnnuo / 12;

    // Costo orario
    const oreLavAnnue = oreLav * settimane;
    const oreEffettive = oreLavAnnue - (ferieGiorni + exFestivita) * 8 - rol;
    const costoOrario = costoTotaleAnnuo / oreEffettive;
    const costoOrarioLordo = ralAnnuo / oreLavAnnue;

    // Cuneo fiscale
    const cuneoFiscale = costoTotaleAnnuo - nettoAnnuo;
    const cuneoPercentuale = (cuneoFiscale / costoTotaleAnnuo) * 100;

    return {
      stipendioLordoMensile,
      inpsDipAnnuo, inpsDipMensile,
      imponibileIrpef,
      irpefLorda, irpefNetta, irpefMensile,
      detrazioni,
      addRegAnnua, addComAnnua, addTotAnnua, addMensile,
      nettoAnnuo, nettoMensile,
      inpsDatoreAnnuo, inpsDatoreMensile,
      inailAnnuo, inailMensile,
      irapAnnuo, irapMensile,
      tfrAnnuo, tfrMensile,
      costoGiornaliero,
      costoFerie, costoExFestivita, costoRol,
      costoFeriePermessiTotale,
      costoMalattia,
      buoniPastoAnnuo,
      fondiTotaliAnnuo, fondiTotaliMensile,
      assicurazioneAnnua,
      costoTotaleAnnuo, costoTotaleMensile,
      oreLavAnnue, oreEffettive,
      costoOrario, costoOrarioLordo,
      cuneoFiscale, cuneoPercentuale,
    };
  }, [
    ral, mensilita, inpsEmployee, inpsEmployer, inailRate, irapRate,
    addRegionale, addComunale, buoniPasto, giorniLavMese,
    ferieGiorni, exFestivita, rol, giorniMalattia,
    assicurazioneExtra, fondoPensione, fondiSanitari, altriCosti,
    oreLav, settimane, coniugeCarico, figliCarico,
  ]);

  const fmt = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("staffCosto.title")}
        subtitle={t("staffCosto.subtitle")}
      >
        <Chip label={t("staffCosto.chip.costoAnnuo")} value={`€ ${fmt(calc.costoTotaleAnnuo)}`} tone="danger" />
        <Chip label={t("staffCosto.chip.costoMensile")} value={`€ ${fmt(calc.costoTotaleMensile)}`} tone="warn" />
        <Chip label={t("staffCosto.chip.nettoMensile")} value={`€ ${fmt(calc.nettoMensile)}`} tone="success" />
        <Chip label={t("staffCosto.chip.costoOrario")} value={`€ ${fmt(calc.costoOrario)}`} tone="accent" />
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* ═══ LEFT: INPUT FORM ═══ */}
        <div className="space-y-4">
          {/* CCNL */}
          <Card title={t("staffCosto.ccnl.title")} description={t("staffCosto.ccnl.desc")}>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>{t("staffCosto.ccnl.contratto")}</label>
                <select className={cn(INPUT, "appearance-none")} value={ccnlId} onChange={(e) => applyCcnl(e.target.value)}>
                  {CCNL_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-rw-muted">{ccnl.description}</p>
              </div>
            </div>
          </Card>

          {/* Retribuzione */}
          <Card title={t("staffCosto.retribuzione.title")} description={t("staffCosto.retribuzione.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t("staffCosto.retribuzione.ral")}</label>
                <input type="number" className={INPUT} value={ral} onChange={(e) => setRal(+e.target.value)} step={500} min={0} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.retribuzione.mensilita")}</label>
                <select className={cn(INPUT, "appearance-none")} value={mensilita} onChange={(e) => setMensilita(+e.target.value as 13 | 14)}>
                  <option value={13}>13</option>
                  <option value={14}>14</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.retribuzione.oreSett")}</label>
                <input type="number" className={INPUT} value={oreLav} onChange={(e) => setOreLav(+e.target.value)} min={1} max={48} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.retribuzione.settimane")}</label>
                <input type="number" className={INPUT} value={settimane} onChange={(e) => setSettimane(+e.target.value)} min={1} max={52} />
              </div>
            </div>
          </Card>

          {/* Contributi */}
          <Card title={t("staffCosto.contributi.title")} description={t("staffCosto.contributi.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t("staffCosto.contributi.inpsDip")} (%)</label>
                <input type="number" className={INPUT} value={inpsEmployee} onChange={(e) => setInpsEmployee(+e.target.value)} step={0.01} min={0} max={100} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.contributi.inpsDat")} (%)</label>
                <input type="number" className={INPUT} value={inpsEmployer} onChange={(e) => setInpsEmployer(+e.target.value)} step={0.01} min={0} max={100} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.contributi.inail")} (%)</label>
                <input type="number" className={INPUT} value={inailRate} onChange={(e) => setInailRate(+e.target.value)} step={0.01} min={0} max={20} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.contributi.irap")} (%)</label>
                <input type="number" className={INPUT} value={irapRate} onChange={(e) => setIrapRate(+e.target.value)} step={0.1} min={0} max={10} />
              </div>
            </div>
          </Card>

          {/* Addizionali */}
          <Card title={t("staffCosto.addizionali.title")} description={t("staffCosto.addizionali.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t("staffCosto.addizionali.regionale")} (%)</label>
                <input type="number" className={INPUT} value={addRegionale} onChange={(e) => setAddRegionale(+e.target.value)} step={0.01} min={0} max={5} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.addizionali.comunale")} (%)</label>
                <input type="number" className={INPUT} value={addComunale} onChange={(e) => setAddComunale(+e.target.value)} step={0.01} min={0} max={3} />
              </div>
            </div>
          </Card>

          {/* Ferie, permessi, malattia */}
          <Card title={t("staffCosto.assenze.title")} description={t("staffCosto.assenze.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t("staffCosto.assenze.ferie")}</label>
                <input type="number" className={INPUT} value={ferieGiorni} onChange={(e) => setFerieGiorni(+e.target.value)} min={0} max={60} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.assenze.exFestivita")}</label>
                <input type="number" className={INPUT} value={exFestivita} onChange={(e) => setExFestivita(+e.target.value)} min={0} max={10} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.assenze.rol")}</label>
                <input type="number" className={INPUT} value={rol} onChange={(e) => setRol(+e.target.value)} min={0} max={200} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.assenze.malattia")}</label>
                <input type="number" className={INPUT} value={giorniMalattia} onChange={(e) => setGiorniMalattia(+e.target.value)} min={0} max={365} />
              </div>
            </div>
          </Card>

          {/* Detrazioni fiscali */}
          <Card title={t("staffCosto.detrazioni.title")} description={t("staffCosto.detrazioni.desc")}>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={coniugeCarico} onChange={(e) => setConiugeCarico(e.target.checked)} className="h-4 w-4 rounded border-rw-line accent-rw-accent" />
                <span className="text-sm text-rw-ink">{t("staffCosto.detrazioni.coniuge")}</span>
              </label>
              <div>
                <label className={LABEL}>{t("staffCosto.detrazioni.figli")}</label>
                <input type="number" className={INPUT} value={figliCarico} onChange={(e) => setFigliCarico(+e.target.value)} min={0} max={20} />
              </div>
            </div>
          </Card>

          {/* Benefit e costi aggiuntivi */}
          <Card title={t("staffCosto.benefit.title")} description={t("staffCosto.benefit.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.buoniPasto")}</label>
                <input type="number" className={INPUT} value={buoniPasto} onChange={(e) => setBuoniPasto(+e.target.value)} step={0.5} min={0} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.giorniLavMese")}</label>
                <input type="number" className={INPUT} value={giorniLavMese} onChange={(e) => setGiorniLavMese(+e.target.value)} min={1} max={30} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.fondoPensione")}</label>
                <input type="number" className={INPUT} value={fondoPensione} onChange={(e) => setFondoPensione(+e.target.value)} step={10} min={0} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.fondiSanitari")}</label>
                <input type="number" className={INPUT} value={fondiSanitari} onChange={(e) => setFondiSanitari(+e.target.value)} step={10} min={0} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.assicurazione")}</label>
                <input type="number" className={INPUT} value={assicurazioneExtra} onChange={(e) => setAssicurazioneExtra(+e.target.value)} step={50} min={0} />
              </div>
              <div>
                <label className={LABEL}>{t("staffCosto.benefit.altriCosti")}</label>
                <input type="number" className={INPUT} value={altriCosti} onChange={(e) => setAltriCosti(+e.target.value)} step={50} min={0} />
              </div>
            </div>
          </Card>
        </div>

        {/* ═══ RIGHT: RESULTS ═══ */}
        <div className="space-y-4">
          {/* Riepilogo principale */}
          <Card title={t("staffCosto.result.title")} description={t("staffCosto.result.desc")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ResultTile icon={<Wallet className="h-5 w-5" />} label={t("staffCosto.result.ral")} value={`€ ${fmt(ral)}`} sub={t("staffCosto.result.annuo")} />
              <ResultTile icon={<DollarSign className="h-5 w-5" />} label={t("staffCosto.result.lordoMensile")} value={`€ ${fmt(calc.stipendioLordoMensile)}`} sub={`x ${mensilita} ${t("staffCosto.result.mensilita")}`} />
              <ResultTile icon={<TrendingUp className="h-5 w-5" />} label={t("staffCosto.result.nettoMensile")} value={`€ ${fmt(calc.nettoMensile)}`} sub={t("staffCosto.result.inTasca")} accent />
              <ResultTile icon={<PiggyBank className="h-5 w-5" />} label={t("staffCosto.result.nettoAnnuo")} value={`€ ${fmt(calc.nettoAnnuo)}`} sub={t("staffCosto.result.annuo")} accent />
            </div>
          </Card>

          {/* IRPEF e detrazioni */}
          <Card title={t("staffCosto.irpef.title")} description={t("staffCosto.irpef.desc")}>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.scaglione")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.aliquota")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.importo")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const imp = calc.imponibileIrpef;
                    let prev = 0;
                    return IRPEF_BRACKETS.map((b, i) => {
                      const slice = Math.min(imp, b.upto) - prev;
                      if (slice <= 0) return null;
                      const tax = slice * b.rate;
                      prev = b.upto;
                      return (
                        <tr key={i} className="border-b border-rw-line/50">
                          <td className="px-3 py-2 text-rw-ink">{prev === Infinity ? `> € 50.000` : `€ 0 – € ${b.upto.toLocaleString("it-IT")}`}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-rw-ink">{(b.rate * 100).toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-rw-ink">€ {fmt(tax)}</td>
                        </tr>
                      );
                    }).filter(Boolean);
                  })()}
                </tbody>
                <tfoot>
                  <tr className="border-t border-rw-line bg-rw-surfaceAlt">
                    <td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.irpef.lorda")}</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calc.irpefLorda)}</td>
                  </tr>
                  <tr className="bg-rw-surfaceAlt">
                    <td className="px-3 py-2 text-rw-muted">{t("staffCosto.irpef.detrazioni")}</td>
                    <td />
                    <td className="px-3 py-2 text-right tabular-nums text-emerald-400">- € {fmt(calc.detrazioni)}</td>
                  </tr>
                  <tr className="border-t border-rw-line bg-rw-surfaceAlt">
                    <td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.irpef.netta")}</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calc.irpefNetta)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.irpef.addRegionale")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.addRegAnnua)}</p>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.irpef.addComunale")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.addComAnnua)}</p>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.irpef.imponibile")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.imponibileIrpef)}</p>
              </div>
            </div>
          </Card>

          {/* Busta paga riepilogo */}
          <Card title={t("staffCosto.bustaPaga.title")} description={t("staffCosto.bustaPaga.desc")}>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.voce")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.mensile")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.annuale")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { voce: t("staffCosto.bustaPaga.lordo"), m: calc.stipendioLordoMensile, a: ral, bold: true },
                    { voce: `- ${t("staffCosto.bustaPaga.inpsDip")}`, m: -calc.inpsDipMensile, a: -calc.inpsDipAnnuo },
                    { voce: `- ${t("staffCosto.bustaPaga.irpef")}`, m: -calc.irpefMensile, a: -calc.irpefNetta },
                    { voce: `- ${t("staffCosto.bustaPaga.addizionali")}`, m: -calc.addMensile, a: -calc.addTotAnnua },
                  ].map((r) => (
                    <tr key={r.voce} className="border-b border-rw-line/50">
                      <td className={cn("px-3 py-2", r.bold ? "font-bold text-rw-ink" : "text-rw-soft")}>{r.voce}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", r.m < 0 ? "text-red-400" : "text-rw-ink")}>{r.m < 0 ? `- € ${fmt(Math.abs(r.m))}` : `€ ${fmt(r.m)}`}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", r.a < 0 ? "text-red-400" : "text-rw-ink")}>{r.a < 0 ? `- € ${fmt(Math.abs(r.a))}` : `€ ${fmt(r.a)}`}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-rw-accent/30 bg-rw-accent/5">
                    <td className="px-3 py-3 font-bold text-rw-accent">{t("staffCosto.bustaPaga.netto")}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-rw-accent">€ {fmt(calc.nettoMensile)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-rw-accent">€ {fmt(calc.nettoAnnuo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Costo totale datore */}
          <Card title={t("staffCosto.costoDatore.title")} description={t("staffCosto.costoDatore.desc")}>
            <div className="overflow-x-auto rounded-xl border border-rw-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-rw-line bg-rw-surfaceAlt">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.voce")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.mensile")}</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.annuale")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { voce: t("staffCosto.costoDatore.ral"), m: ral / 12, a: ral },
                    { voce: `+ ${t("staffCosto.costoDatore.inpsDat")}`, m: calc.inpsDatoreMensile, a: calc.inpsDatoreAnnuo },
                    { voce: `+ ${t("staffCosto.costoDatore.inail")}`, m: calc.inailMensile, a: calc.inailAnnuo },
                    { voce: `+ ${t("staffCosto.costoDatore.irap")}`, m: calc.irapMensile, a: calc.irapAnnuo },
                    { voce: `+ ${t("staffCosto.costoDatore.tfr")}`, m: calc.tfrMensile, a: calc.tfrAnnuo },
                    ...(calc.buoniPastoAnnuo > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.buoniPasto")}`, m: calc.buoniPastoAnnuo / 12, a: calc.buoniPastoAnnuo }] : []),
                    ...(calc.fondiTotaliAnnuo > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.fondi")}`, m: calc.fondiTotaliMensile, a: calc.fondiTotaliAnnuo }] : []),
                    ...(calc.assicurazioneAnnua > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.assicurazione")}`, m: calc.assicurazioneAnnua / 12, a: calc.assicurazioneAnnua }] : []),
                    ...(calc.costoMalattia > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.malattia")}`, m: calc.costoMalattia / 12, a: calc.costoMalattia }] : []),
                    ...(altriCosti > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.altriCosti")}`, m: altriCosti / 12, a: altriCosti }] : []),
                  ].map((r) => (
                    <tr key={r.voce} className="border-b border-rw-line/50">
                      <td className="px-3 py-2 text-rw-soft">{r.voce}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rw-ink">€ {fmt(r.m)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-rw-ink">€ {fmt(r.a)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-red-500/30 bg-red-500/5">
                    <td className="px-3 py-3 font-bold text-red-400">{t("staffCosto.costoDatore.totale")}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-red-400">€ {fmt(calc.costoTotaleMensile)}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums text-red-400">€ {fmt(calc.costoTotaleAnnuo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* KPI finali */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile icon={<Calculator className="h-5 w-5" />} label={t("staffCosto.kpi.costoOrario")} value={`€ ${fmt(calc.costoOrario)}`} color="text-rw-accent" bgColor="bg-rw-accent/10 border-rw-accent/30" />
            <KpiTile icon={<TrendingDown className="h-5 w-5" />} label={t("staffCosto.kpi.cuneo")} value={`${calc.cuneoPercentuale.toFixed(1)}%`} color="text-red-400" bgColor="bg-red-500/10 border-red-500/30" />
            <KpiTile icon={<Shield className="h-5 w-5" />} label={t("staffCosto.kpi.tfrAnnuo")} value={`€ ${fmt(calc.tfrAnnuo)}`} color="text-amber-400" bgColor="bg-amber-500/10 border-amber-500/30" />
            <KpiTile icon={<Users className="h-5 w-5" />} label={t("staffCosto.kpi.oreEffettive")} value={calc.oreEffettive.toFixed(0)} color="text-blue-400" bgColor="bg-blue-500/10 border-blue-500/30" />
          </div>

          {/* Dettaglio ferie e permessi */}
          <Card title={t("staffCosto.ferie.title")} description={t("staffCosto.ferie.desc")}>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.ferie.costoFerie")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.costoFerie)}</p>
                <p className="text-[10px] text-rw-muted">{ferieGiorni} {t("staffCosto.ferie.giorni")}</p>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.ferie.costoExFest")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.costoExFestivita)}</p>
                <p className="text-[10px] text-rw-muted">{exFestivita} {t("staffCosto.ferie.giorni")}</p>
              </div>
              <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
                <p className="text-[10px] font-semibold uppercase text-rw-muted">{t("staffCosto.ferie.costoRol")}</p>
                <p className="text-lg font-bold tabular-nums text-rw-ink">€ {fmt(calc.costoRol)}</p>
                <p className="text-[10px] text-rw-muted">{rol} {t("staffCosto.ferie.ore")}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultTile({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", accent ? "border-rw-accent/30 bg-rw-accent/10" : "border-rw-line bg-rw-surfaceAlt")}>
      <div className="flex items-center gap-2">
        <span className={accent ? "text-rw-accent" : "text-rw-muted"}>{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{label}</span>
      </div>
      <p className={cn("mt-2 text-xl font-bold tabular-nums", accent ? "text-rw-accent" : "text-rw-ink")}>{value}</p>
      <p className="mt-0.5 text-[10px] text-rw-muted">{sub}</p>
    </div>
  );
}

function KpiTile({ icon, label, value, color, bgColor }: { icon: React.ReactNode; label: string; value: string; color: string; bgColor: string }) {
  return (
    <div className={cn("rounded-xl border p-4 text-center", bgColor)}>
      <span className={cn("mx-auto block w-fit", color)}>{icon}</span>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-rw-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular-nums", color)}>{value}</p>
    </div>
  );
}
