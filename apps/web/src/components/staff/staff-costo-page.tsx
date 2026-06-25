"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Calculator,
  DollarSign,
  Flag,
  PiggyBank,
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

type Country = "IT" | "NL";

/* ═══════════════════════════════════════════════════
   ITALY — CCNL presets & tax engine
   ═══════════════════════════════════════════════════ */
type ItPreset = {
  id: string; label: string;
  inpsEmployee: number; inpsEmployer: number;
  inailRate: number; irapRate: number;
  mensilita: 13 | 14; description: string;
};

const IT_PRESETS: ItPreset[] = [
  { id: "turismo", label: "Turismo / Pubblici Esercizi", inpsEmployee: 9.19, inpsEmployer: 29.56, inailRate: 1.2, irapRate: 3.9, mensilita: 14, description: "CCNL Turismo — Pubblici esercizi, hotel, ristoranti, bar" },
  { id: "commercio", label: "Commercio / Terziario", inpsEmployee: 9.19, inpsEmployer: 28.98, inailRate: 0.5, irapRate: 3.9, mensilita: 14, description: "CCNL Commercio e Terziario — Confcommercio" },
  { id: "artigiani_alimentaristi", label: "Artigiani Alimentaristi", inpsEmployee: 9.19, inpsEmployer: 28.20, inailRate: 1.5, irapRate: 3.9, mensilita: 14, description: "CCNL Artigiani del settore alimentare" },
  { id: "it_custom", label: "Personalizzato", inpsEmployee: 9.19, inpsEmployer: 29.56, inailRate: 1.2, irapRate: 3.9, mensilita: 13, description: "Parametri personalizzabili" },
];

const IRPEF_BRACKETS: { upto: number; rate: number }[] = [
  { upto: 28_000, rate: 0.23 },
  { upto: 50_000, rate: 0.35 },
  { upto: Infinity, rate: 0.43 },
];

function calcIrpefLorda(imponibile: number): number {
  let tax = 0; let prev = 0;
  for (const b of IRPEF_BRACKETS) {
    const slice = Math.min(imponibile, b.upto) - prev;
    if (slice <= 0) break;
    tax += slice * b.rate; prev = b.upto;
  }
  return tax;
}

function calcDetrazioneLavoroDipendente(reddito: number): number {
  if (reddito <= 15_000) return Math.min(1_955, 1_880 + (1_955 - 1_880) * (15_000 - reddito) / 15_000);
  if (reddito <= 28_000) return 1_910 + 1_190 * (28_000 - reddito) / 13_000;
  if (reddito <= 50_000) return 1_910 * (50_000 - reddito) / 22_000;
  return 0;
}

/* ═══════════════════════════════════════════════════
   NETHERLANDS — CAO presets & tax engine (2024-2026)
   ═══════════════════════════════════════════════════ */
type NlPreset = {
  id: string; label: string;
  wwLow: number; wwHigh: number;
  whkRate: number; zvwEmployer: number;
  pensionEmployee: number; pensionEmployer: number;
  vakantiegeldPct: number;
  description: string;
};

const NL_PRESETS: NlPreset[] = [
  { id: "horeca_cao", label: "Horeca CAO", wwLow: 2.64, wwHigh: 7.64, whkRate: 1.28, zvwEmployer: 6.68, pensionEmployee: 4.0, pensionEmployer: 8.0, vakantiegeldPct: 8.0, description: "CAO Horeca — hotels, restaurants, cafés, catering" },
  { id: "retail_cao", label: "Retail CAO", wwLow: 2.64, wwHigh: 7.64, whkRate: 0.90, zvwEmployer: 6.68, pensionEmployee: 3.5, pensionEmployer: 7.0, vakantiegeldPct: 8.0, description: "CAO Retail — winkels, detailhandel" },
  { id: "schoonmaak_cao", label: "Schoonmaak CAO", wwLow: 2.64, wwHigh: 7.64, whkRate: 1.50, zvwEmployer: 6.68, pensionEmployee: 3.0, pensionEmployer: 6.5, vakantiegeldPct: 8.0, description: "CAO Schoonmaak — schoonmaak en glazenwassersbedrijf" },
  { id: "nl_custom", label: "Aangepast / Custom", wwLow: 2.64, wwHigh: 7.64, whkRate: 1.28, zvwEmployer: 6.68, pensionEmployee: 4.0, pensionEmployer: 8.0, vakantiegeldPct: 8.0, description: "Vrij aanpasbare parameters" },
];

/* Box 1 brackets 2024-2026: combined loonbelasting + premies volksverzekeringen */
const NL_TAX_BRACKETS: { upto: number; rate: number }[] = [
  { upto: 75_518, rate: 0.3697 },
  { upto: Infinity, rate: 0.4950 },
];

/* Volksverzekeringen cap (premie-inkomen grens): only paid on first €38,098 */
const NL_VOLKS_CAP = 38_098;
const NL_VOLKS_RATE = 0.2765; // AOW 17.90% + ANW 0.10% + WLZ 9.65%

function calcNlLoonheffing(brutoJaar: number): number {
  let tax = 0; let prev = 0;
  for (const b of NL_TAX_BRACKETS) {
    const slice = Math.min(brutoJaar, b.upto) - prev;
    if (slice <= 0) break;
    tax += slice * b.rate; prev = b.upto;
  }
  return tax;
}

/* Algemene heffingskorting 2024 */
function calcAlgemeneHeffingskorting(inkomen: number): number {
  if (inkomen <= 24_812) return 3_362;
  if (inkomen <= 75_518) return Math.max(0, 3_362 - 0.06630 * (inkomen - 24_812));
  return 0;
}

/* Arbeidskorting 2024 */
function calcArbeidskorting(inkomen: number): number {
  if (inkomen <= 11_491) return 0.08425 * inkomen;
  if (inkomen <= 24_821) return 968 + 0.31433 * (inkomen - 11_491);
  if (inkomen <= 39_958) return 5_158 + 0.02471 * (inkomen - 24_821);
  if (inkomen <= 124_935) return 5_532 - 0.06510 * (inkomen - 39_958);
  return 0;
}

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export function StaffCostoPage() {
  const { t } = useI18n();

  /* ── Country selector ────────────────────── */
  const [country, setCountry] = useState<Country>("IT");

  /* ── Common ──────────────────────────────── */
  const [ral, setRal] = useState(22_000);
  const [oreLav, setOreLav] = useState(40);
  const [settimane, setSettimane] = useState(52);
  const [ferieGiorni, setFerieGiorni] = useState(country === "IT" ? 26 : 25);
  const [giorniMalattia, setGiorniMalattia] = useState(0);
  const [buoniPasto, setBuoniPasto] = useState(0);
  const [giorniLavMese, setGiorniLavMese] = useState(22);
  const [assicurazioneExtra, setAssicurazioneExtra] = useState(0);
  const [altriCosti, setAltriCosti] = useState(0);

  /* ── IT specific ─────────────────────────── */
  const [itPresetId, setItPresetId] = useState("turismo");
  const itPreset = IT_PRESETS.find((p) => p.id === itPresetId) ?? IT_PRESETS[0];
  const [mensilita, setMensilita] = useState<13 | 14>(itPreset.mensilita);
  const [inpsEmployee, setInpsEmployee] = useState(itPreset.inpsEmployee);
  const [inpsEmployer, setInpsEmployer] = useState(itPreset.inpsEmployer);
  const [inailRate, setInailRate] = useState(itPreset.inailRate);
  const [irapRate, setIrapRate] = useState(itPreset.irapRate);
  const [addRegionale, setAddRegionale] = useState(1.73);
  const [addComunale, setAddComunale] = useState(0.8);
  const [fondoPensione, setFondoPensione] = useState(0);
  const [fondiSanitari, setFondiSanitari] = useState(0);
  const [coniugeCarico, setConiugeCarico] = useState(false);
  const [figliCarico, setFigliCarico] = useState(0);
  const [exFestivita, setExFestivita] = useState(4);
  const [rol, setRol] = useState(72);

  /* ── NL specific ─────────────────────────── */
  const [nlPresetId, setNlPresetId] = useState("horeca_cao");
  const nlPreset = NL_PRESETS.find((p) => p.id === nlPresetId) ?? NL_PRESETS[0];
  const [wwRate, setWwRate] = useState(nlPreset.wwLow);
  const [wwContractType, setWwContractType] = useState<"vast" | "flex">("vast");
  const [whkRate, setWhkRate] = useState(nlPreset.whkRate);
  const [zvwEmployer, setZvwEmployer] = useState(nlPreset.zvwEmployer);
  const [nlPensionEmployee, setNlPensionEmployee] = useState(nlPreset.pensionEmployee);
  const [nlPensionEmployer, setNlPensionEmployer] = useState(nlPreset.pensionEmployer);
  const [vakantiegeldPct, setVakantiegeldPct] = useState(nlPreset.vakantiegeldPct);
  const [nlToeslagPartner, setNlToeslagPartner] = useState(false);
  const [anniServizio, setAnniServizio] = useState(1);
  const [nlFeestdagen, setNlFeestdagen] = useState(8);
  const [nlAdvDagen, setNlAdvDagen] = useState(0);

  const applyItPreset = useCallback((id: string) => {
    setItPresetId(id);
    const p = IT_PRESETS.find((x) => x.id === id) ?? IT_PRESETS[0];
    setInpsEmployee(p.inpsEmployee); setInpsEmployer(p.inpsEmployer);
    setInailRate(p.inailRate); setIrapRate(p.irapRate); setMensilita(p.mensilita);
  }, []);

  const applyNlPreset = useCallback((id: string) => {
    setNlPresetId(id);
    const p = NL_PRESETS.find((x) => x.id === id) ?? NL_PRESETS[0];
    setWwRate(wwContractType === "vast" ? p.wwLow : p.wwHigh);
    setWhkRate(p.whkRate); setZvwEmployer(p.zvwEmployer);
    setNlPensionEmployee(p.pensionEmployee); setNlPensionEmployer(p.pensionEmployer);
    setVakantiegeldPct(p.vakantiegeldPct);
  }, [wwContractType]);

  const switchCountry = useCallback((c: Country) => {
    setCountry(c);
    if (c === "IT") {
      setFerieGiorni(26); setRal(22_000);
    } else {
      setFerieGiorni(25); setRal(30_000);
    }
  }, []);

  /* ═══ ITALY CALCULATIONS ═══ */
  const calcIT = useMemo(() => {
    if (country !== "IT") return null;
    const ralAnnuo = ral;
    const stipendioLordoMensile = ralAnnuo / mensilita;
    const inpsDipAnnuo = ralAnnuo * (inpsEmployee / 100);
    const inpsDipMensile = inpsDipAnnuo / mensilita;
    const imponibileIrpef = ralAnnuo - inpsDipAnnuo;
    const irpefLorda = calcIrpefLorda(imponibileIrpef);
    let detrazioni = calcDetrazioneLavoroDipendente(ralAnnuo);
    if (coniugeCarico && ralAnnuo <= 80_000) detrazioni += 800;
    detrazioni += figliCarico * 950;
    const irpefNetta = Math.max(0, irpefLorda - detrazioni);
    const irpefMensile = irpefNetta / mensilita;
    const addRegAnnua = imponibileIrpef * (addRegionale / 100);
    const addComAnnua = imponibileIrpef * (addComunale / 100);
    const addTotAnnua = addRegAnnua + addComAnnua;
    const addMensile = addTotAnnua / 12;
    const nettoAnnuo = ralAnnuo - inpsDipAnnuo - irpefNetta - addTotAnnua;
    const nettoMensile = nettoAnnuo / mensilita;
    const inpsDatoreAnnuo = ralAnnuo * (inpsEmployer / 100);
    const inpsDatoreMensile = inpsDatoreAnnuo / 12;
    const inailAnnuo = ralAnnuo * (inailRate / 100);
    const inailMensile = inailAnnuo / 12;
    const baseIrap = ralAnnuo + inpsDatoreAnnuo;
    const irapAnnuo = baseIrap * (irapRate / 100);
    const irapMensile = irapAnnuo / 12;
    const tfrAnnuo = ralAnnuo / 13.5;
    const tfrMensile = tfrAnnuo / 12;
    const costoGiornaliero = ralAnnuo / (settimane * 5);
    const costoFerie = ferieGiorni * costoGiornaliero;
    const costoExFestivita = exFestivita * costoGiornaliero;
    const costoRol = (rol / 8) * costoGiornaliero;
    const costoMalattia = giorniMalattia * costoGiornaliero * 0.5;
    const buoniPastoAnnuo = buoniPasto * giorniLavMese * 12;
    const fondiTotaliAnnuo = fondoPensione + fondiSanitari;
    const fondiTotaliMensile = fondiTotaliAnnuo / 12;
    const costoTotaleAnnuo = ralAnnuo + inpsDatoreAnnuo + inailAnnuo + irapAnnuo + tfrAnnuo + buoniPastoAnnuo + fondiTotaliAnnuo + assicurazioneExtra + costoMalattia + altriCosti;
    const costoTotaleMensile = costoTotaleAnnuo / 12;
    const oreLavAnnue = oreLav * settimane;
    const oreEffettive = oreLavAnnue - (ferieGiorni + exFestivita) * 8 - rol;
    const costoOrario = costoTotaleAnnuo / oreEffettive;
    const cuneoFiscale = costoTotaleAnnuo - nettoAnnuo;
    const cuneoPercentuale = (cuneoFiscale / costoTotaleAnnuo) * 100;

    return {
      stipendioLordoMensile, inpsDipAnnuo, inpsDipMensile, imponibileIrpef,
      irpefLorda, irpefNetta, irpefMensile, detrazioni,
      addRegAnnua, addComAnnua, addTotAnnua, addMensile,
      nettoAnnuo, nettoMensile,
      inpsDatoreAnnuo, inpsDatoreMensile, inailAnnuo, inailMensile,
      irapAnnuo, irapMensile, tfrAnnuo, tfrMensile,
      costoFerie, costoExFestivita, costoRol, costoMalattia,
      buoniPastoAnnuo, fondiTotaliAnnuo, fondiTotaliMensile,
      costoTotaleAnnuo, costoTotaleMensile,
      oreEffettive, costoOrario, cuneoFiscale, cuneoPercentuale,
    };
  }, [country, ral, mensilita, inpsEmployee, inpsEmployer, inailRate, irapRate, addRegionale, addComunale, buoniPasto, giorniLavMese, ferieGiorni, exFestivita, rol, giorniMalattia, assicurazioneExtra, fondoPensione, fondiSanitari, altriCosti, oreLav, settimane, coniugeCarico, figliCarico]);

  /* ═══ NETHERLANDS CALCULATIONS ═══ */
  const calcNL = useMemo(() => {
    if (country !== "NL") return null;
    const brutoJaar = ral;
    const brutoMaand = brutoJaar / 12;

    // Vakantiegeld (holiday allowance)
    const vakantiegeldJaar = brutoJaar * (vakantiegeldPct / 100);
    const totaalBrutoJaar = brutoJaar + vakantiegeldJaar;

    // Employee pension contribution
    const pensionEmpJaar = brutoJaar * (nlPensionEmployee / 100);

    // Belastbaar loon (taxable wage) = bruto - pension employee
    const belastbaarLoon = totaalBrutoJaar - pensionEmpJaar;

    // Loonheffing (wage tax + national insurance)
    const loonheffingBruto = calcNlLoonheffing(belastbaarLoon);

    // Heffingskortingen (tax credits)
    const algHeffingskorting = calcAlgemeneHeffingskorting(belastbaarLoon);
    const arbeidskorting = calcArbeidskorting(belastbaarLoon);
    const totaalKortingen = algHeffingskorting + arbeidskorting;

    // Netto loonheffing
    const loonheffingNetto = Math.max(0, loonheffingBruto - totaalKortingen);
    const loonheffingMaand = loonheffingNetto / 12;

    // ZVW employee (nominale premie ~€1,600/jaar typically, but employer pays income-based)
    const zvwNominaal = 1_600;

    // Netto jaarlijks
    const nettoJaar = totaalBrutoJaar - pensionEmpJaar - loonheffingNetto - zvwNominaal;
    const nettoMaand = nettoJaar / 12;

    // ── EMPLOYER COSTS ──
    // WW (unemployment insurance)
    const wwJaar = brutoJaar * (wwRate / 100);
    const wwMaand = wwJaar / 12;

    // WHK (WIA/WAO disability)
    const whkJaar = brutoJaar * (whkRate / 100);
    const whkMaand = whkJaar / 12;

    // ZVW employer (income-dependent)
    const zvwMaxLoon = 71_628;
    const zvwBasis = Math.min(brutoJaar, zvwMaxLoon);
    const zvwWgJaar = zvwBasis * (zvwEmployer / 100);
    const zvwWgMaand = zvwWgJaar / 12;

    // Employer pension
    const pensionWgJaar = brutoJaar * (nlPensionEmployer / 100);
    const pensionWgMaand = pensionWgJaar / 12;

    // Transitievergoeding (severance reserve) = 1/3 month per year of service
    const transitieJaar = (brutoMaand / 3) * anniServizio;
    const transitieMaand = transitieJaar / 12;
    const transitieReserveJaar = brutoMaand / 3;
    const transitieReserveMaand = transitieReserveJaar / 12;

    // Leave costs
    const costoGiornaliero = brutoJaar / (settimane * 5);
    const costoVakantie = ferieGiorni * costoGiornaliero;
    const costoFeestdagen = nlFeestdagen * costoGiornaliero;
    const costoAdv = nlAdvDagen * costoGiornaliero;
    const costoZiekte = giorniMalattia * costoGiornaliero * 0.7;

    // Buoni pasto / lunch vergoeding
    const buoniPastoAnnuo = buoniPasto * giorniLavMese * 12;

    // Total employer cost
    const costoTotaleJaar =
      brutoJaar + vakantiegeldJaar +
      wwJaar + whkJaar + zvwWgJaar + pensionWgJaar +
      transitieReserveJaar +
      buoniPastoAnnuo + assicurazioneExtra + costoZiekte + altriCosti;

    const costoTotaleMaand = costoTotaleJaar / 12;

    // Hourly cost
    const oreJaar = oreLav * settimane;
    const oreEffettive = oreJaar - (ferieGiorni + nlFeestdagen + nlAdvDagen) * 8;
    const costoOrario = costoTotaleJaar / oreEffettive;

    // Tax wedge
    const cuneoFiscale = costoTotaleJaar - nettoJaar;
    const cuneoPercentuale = (cuneoFiscale / costoTotaleJaar) * 100;

    return {
      brutoMaand, vakantiegeldJaar, totaalBrutoJaar,
      pensionEmpJaar, belastbaarLoon,
      loonheffingBruto, algHeffingskorting, arbeidskorting, totaalKortingen,
      loonheffingNetto, loonheffingMaand,
      zvwNominaal, nettoJaar, nettoMaand,
      wwJaar, wwMaand, whkJaar, whkMaand,
      zvwWgJaar, zvwWgMaand, pensionWgJaar, pensionWgMaand,
      transitieJaar, transitieMaand, transitieReserveJaar, transitieReserveMaand,
      costoVakantie, costoFeestdagen, costoAdv, costoZiekte,
      buoniPastoAnnuo,
      costoTotaleJaar, costoTotaleMaand,
      oreEffettive, costoOrario,
      cuneoFiscale, cuneoPercentuale,
    };
  }, [country, ral, vakantiegeldPct, nlPensionEmployee, wwRate, whkRate, zvwEmployer, nlPensionEmployer, anniServizio, ferieGiorni, nlFeestdagen, nlAdvDagen, giorniMalattia, buoniPasto, giorniLavMese, assicurazioneExtra, altriCosti, oreLav, settimane]);

  const fmt = (n: number) => n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ═══ Derived summary values ═══ */
  const summary = useMemo(() => {
    if (country === "IT" && calcIT) return { costoAnnuo: calcIT.costoTotaleAnnuo, costoMensile: calcIT.costoTotaleMensile, nettoMensile: calcIT.nettoMensile, costoOrario: calcIT.costoOrario };
    if (country === "NL" && calcNL) return { costoAnnuo: calcNL.costoTotaleJaar, costoMensile: calcNL.costoTotaleMaand, nettoMensile: calcNL.nettoMaand, costoOrario: calcNL.costoOrario };
    return { costoAnnuo: 0, costoMensile: 0, nettoMensile: 0, costoOrario: 0 };
  }, [country, calcIT, calcNL]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("staffCosto.title")} subtitle={t("staffCosto.subtitle")}>
        <Chip label={t("staffCosto.chip.costoAnnuo")} value={`€ ${fmt(summary.costoAnnuo)}`} tone="danger" />
        <Chip label={t("staffCosto.chip.costoMensile")} value={`€ ${fmt(summary.costoMensile)}`} tone="warn" />
        <Chip label={t("staffCosto.chip.nettoMensile")} value={`€ ${fmt(summary.nettoMensile)}`} tone="success" />
        <Chip label={t("staffCosto.chip.costoOrario")} value={`€ ${fmt(summary.costoOrario)}`} tone="accent" />
      </PageHeader>

      {/* ── Country switch ── */}
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-rw-muted" />
        <span className="text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.country.label")}</span>
        <div className="flex overflow-hidden rounded-xl border border-rw-line">
          {(["IT", "NL"] as Country[]).map((c) => (
            <button key={c} onClick={() => switchCountry(c)} className={cn("px-4 py-2 text-sm font-semibold transition-colors", country === c ? "bg-rw-accent text-white" : "bg-rw-surfaceAlt text-rw-muted hover:bg-rw-surfaceAlt/80")}>
              {c === "IT" ? `🇮🇹 ${t("staffCosto.country.it")}` : `🇳🇱 ${t("staffCosto.country.nl")}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        {/* ═══ LEFT: INPUT FORM ═══ */}
        <div className="space-y-4">

          {/* ── Preset selector ── */}
          {country === "IT" ? (
            <Card title={t("staffCosto.ccnl.title")} description={t("staffCosto.ccnl.desc")}>
              <div>
                <label className={LABEL}>{t("staffCosto.ccnl.contratto")}</label>
                <select className={cn(INPUT, "appearance-none")} value={itPresetId} onChange={(e) => applyItPreset(e.target.value)}>
                  {IT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <p className="mt-1 text-[10px] text-rw-muted">{itPreset.description}</p>
              </div>
            </Card>
          ) : (
            <Card title={t("staffCosto.nl.cao.title")} description={t("staffCosto.nl.cao.desc")}>
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>{t("staffCosto.nl.cao.contract")}</label>
                  <select className={cn(INPUT, "appearance-none")} value={nlPresetId} onChange={(e) => applyNlPreset(e.target.value)}>
                    {NL_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  <p className="mt-1 text-[10px] text-rw-muted">{nlPreset.description}</p>
                </div>
                <div>
                  <label className={LABEL}>{t("staffCosto.nl.contractType")}</label>
                  <select className={cn(INPUT, "appearance-none")} value={wwContractType} onChange={(e) => { const v = e.target.value as "vast" | "flex"; setWwContractType(v); const p = NL_PRESETS.find((x) => x.id === nlPresetId) ?? NL_PRESETS[0]; setWwRate(v === "vast" ? p.wwLow : p.wwHigh); }}>
                    <option value="vast">{t("staffCosto.nl.vast")}</option>
                    <option value="flex">{t("staffCosto.nl.flex")}</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* ── Compensation ── */}
          <Card title={t("staffCosto.retribuzione.title")} description={t("staffCosto.retribuzione.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>{country === "IT" ? t("staffCosto.retribuzione.ral") : t("staffCosto.nl.brutoJaar")}</label>
                <input type="number" className={INPUT} value={ral} onChange={(e) => setRal(+e.target.value)} step={500} min={0} />
              </div>
              {country === "IT" && (
                <div>
                  <label className={LABEL}>{t("staffCosto.retribuzione.mensilita")}</label>
                  <select className={cn(INPUT, "appearance-none")} value={mensilita} onChange={(e) => setMensilita(+e.target.value as 13 | 14)}>
                    <option value={13}>13</option>
                    <option value={14}>14</option>
                  </select>
                </div>
              )}
              {country === "NL" && (
                <div>
                  <label className={LABEL}>{t("staffCosto.nl.vakantiegeld")} (%)</label>
                  <input type="number" className={INPUT} value={vakantiegeldPct} onChange={(e) => setVakantiegeldPct(+e.target.value)} step={0.5} min={0} max={12} />
                </div>
              )}
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

          {/* ── Contributions ── */}
          {country === "IT" ? (
            <Card title={t("staffCosto.contributi.title")} description={t("staffCosto.contributi.desc")}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>{t("staffCosto.contributi.inpsDip")} (%)</label><input type="number" className={INPUT} value={inpsEmployee} onChange={(e) => setInpsEmployee(+e.target.value)} step={0.01} min={0} max={100} /></div>
                <div><label className={LABEL}>{t("staffCosto.contributi.inpsDat")} (%)</label><input type="number" className={INPUT} value={inpsEmployer} onChange={(e) => setInpsEmployer(+e.target.value)} step={0.01} min={0} max={100} /></div>
                <div><label className={LABEL}>{t("staffCosto.contributi.inail")} (%)</label><input type="number" className={INPUT} value={inailRate} onChange={(e) => setInailRate(+e.target.value)} step={0.01} min={0} max={20} /></div>
                <div><label className={LABEL}>{t("staffCosto.contributi.irap")} (%)</label><input type="number" className={INPUT} value={irapRate} onChange={(e) => setIrapRate(+e.target.value)} step={0.1} min={0} max={10} /></div>
              </div>
            </Card>
          ) : (
            <Card title={t("staffCosto.nl.premies.title")} description={t("staffCosto.nl.premies.desc")}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>{t("staffCosto.nl.premies.ww")} (%)</label><input type="number" className={INPUT} value={wwRate} onChange={(e) => setWwRate(+e.target.value)} step={0.01} min={0} max={15} /></div>
                <div><label className={LABEL}>{t("staffCosto.nl.premies.whk")} (%)</label><input type="number" className={INPUT} value={whkRate} onChange={(e) => setWhkRate(+e.target.value)} step={0.01} min={0} max={10} /></div>
                <div><label className={LABEL}>{t("staffCosto.nl.premies.zvw")} (%)</label><input type="number" className={INPUT} value={zvwEmployer} onChange={(e) => setZvwEmployer(+e.target.value)} step={0.01} min={0} max={15} /></div>
                <div><label className={LABEL}>{t("staffCosto.nl.premies.pensionWg")} (%)</label><input type="number" className={INPUT} value={nlPensionEmployer} onChange={(e) => setNlPensionEmployer(+e.target.value)} step={0.1} min={0} max={30} /></div>
                <div><label className={LABEL}>{t("staffCosto.nl.premies.pensionWn")} (%)</label><input type="number" className={INPUT} value={nlPensionEmployee} onChange={(e) => setNlPensionEmployee(+e.target.value)} step={0.1} min={0} max={30} /></div>
                <div><label className={LABEL}>{t("staffCosto.nl.premies.anniServ")}</label><input type="number" className={INPUT} value={anniServizio} onChange={(e) => setAnniServizio(+e.target.value)} min={0} max={50} /></div>
              </div>
            </Card>
          )}

          {/* ── IT Addizionali / NL has no equivalent ── */}
          {country === "IT" && (
            <Card title={t("staffCosto.addizionali.title")} description={t("staffCosto.addizionali.desc")}>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>{t("staffCosto.addizionali.regionale")} (%)</label><input type="number" className={INPUT} value={addRegionale} onChange={(e) => setAddRegionale(+e.target.value)} step={0.01} min={0} max={5} /></div>
                <div><label className={LABEL}>{t("staffCosto.addizionali.comunale")} (%)</label><input type="number" className={INPUT} value={addComunale} onChange={(e) => setAddComunale(+e.target.value)} step={0.01} min={0} max={3} /></div>
              </div>
            </Card>
          )}

          {/* ── Leave ── */}
          <Card title={t("staffCosto.assenze.title")} description={t("staffCosto.assenze.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL}>{t("staffCosto.assenze.ferie")}</label><input type="number" className={INPUT} value={ferieGiorni} onChange={(e) => setFerieGiorni(+e.target.value)} min={0} max={60} /></div>
              {country === "IT" ? (
                <>
                  <div><label className={LABEL}>{t("staffCosto.assenze.exFestivita")}</label><input type="number" className={INPUT} value={exFestivita} onChange={(e) => setExFestivita(+e.target.value)} min={0} max={10} /></div>
                  <div><label className={LABEL}>{t("staffCosto.assenze.rol")}</label><input type="number" className={INPUT} value={rol} onChange={(e) => setRol(+e.target.value)} min={0} max={200} /></div>
                </>
              ) : (
                <>
                  <div><label className={LABEL}>{t("staffCosto.nl.feestdagen")}</label><input type="number" className={INPUT} value={nlFeestdagen} onChange={(e) => setNlFeestdagen(+e.target.value)} min={0} max={15} /></div>
                  <div><label className={LABEL}>{t("staffCosto.nl.advDagen")}</label><input type="number" className={INPUT} value={nlAdvDagen} onChange={(e) => setNlAdvDagen(+e.target.value)} min={0} max={20} /></div>
                </>
              )}
              <div><label className={LABEL}>{t("staffCosto.assenze.malattia")}</label><input type="number" className={INPUT} value={giorniMalattia} onChange={(e) => setGiorniMalattia(+e.target.value)} min={0} max={365} /></div>
            </div>
          </Card>

          {/* ── Deductions ── */}
          {country === "IT" ? (
            <Card title={t("staffCosto.detrazioni.title")} description={t("staffCosto.detrazioni.desc")}>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={coniugeCarico} onChange={(e) => setConiugeCarico(e.target.checked)} className="h-4 w-4 rounded border-rw-line accent-rw-accent" />
                  <span className="text-sm text-rw-ink">{t("staffCosto.detrazioni.coniuge")}</span>
                </label>
                <div><label className={LABEL}>{t("staffCosto.detrazioni.figli")}</label><input type="number" className={INPUT} value={figliCarico} onChange={(e) => setFigliCarico(+e.target.value)} min={0} max={20} /></div>
              </div>
            </Card>
          ) : (
            <Card title={t("staffCosto.nl.kortingen.title")} description={t("staffCosto.nl.kortingen.desc")}>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={nlToeslagPartner} onChange={(e) => setNlToeslagPartner(e.target.checked)} className="h-4 w-4 rounded border-rw-line accent-rw-accent" />
                  <span className="text-sm text-rw-ink">{t("staffCosto.nl.kortingen.partner")}</span>
                </label>
                <p className="text-[10px] text-rw-muted">{t("staffCosto.nl.kortingen.autoCalc")}</p>
              </div>
            </Card>
          )}

          {/* ── Benefits ── */}
          <Card title={t("staffCosto.benefit.title")} description={t("staffCosto.benefit.desc")}>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={LABEL}>{t("staffCosto.benefit.buoniPasto")}</label><input type="number" className={INPUT} value={buoniPasto} onChange={(e) => setBuoniPasto(+e.target.value)} step={0.5} min={0} /></div>
              <div><label className={LABEL}>{t("staffCosto.benefit.giorniLavMese")}</label><input type="number" className={INPUT} value={giorniLavMese} onChange={(e) => setGiorniLavMese(+e.target.value)} min={1} max={30} /></div>
              {country === "IT" && (
                <>
                  <div><label className={LABEL}>{t("staffCosto.benefit.fondoPensione")}</label><input type="number" className={INPUT} value={fondoPensione} onChange={(e) => setFondoPensione(+e.target.value)} step={10} min={0} /></div>
                  <div><label className={LABEL}>{t("staffCosto.benefit.fondiSanitari")}</label><input type="number" className={INPUT} value={fondiSanitari} onChange={(e) => setFondiSanitari(+e.target.value)} step={10} min={0} /></div>
                </>
              )}
              <div><label className={LABEL}>{t("staffCosto.benefit.assicurazione")}</label><input type="number" className={INPUT} value={assicurazioneExtra} onChange={(e) => setAssicurazioneExtra(+e.target.value)} step={50} min={0} /></div>
              <div><label className={LABEL}>{t("staffCosto.benefit.altriCosti")}</label><input type="number" className={INPUT} value={altriCosti} onChange={(e) => setAltriCosti(+e.target.value)} step={50} min={0} /></div>
            </div>
          </Card>
        </div>

        {/* ═══ RIGHT: RESULTS ═══ */}
        <div className="space-y-4">
          {/* ── Summary tiles ── */}
          <Card title={t("staffCosto.result.title")} description={t("staffCosto.result.desc")}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <ResultTile icon={<Wallet className="h-5 w-5" />} label={country === "IT" ? t("staffCosto.result.ral") : t("staffCosto.nl.brutoJaarLabel")} value={`€ ${fmt(ral)}`} sub={t("staffCosto.result.annuo")} />
              <ResultTile icon={<DollarSign className="h-5 w-5" />} label={t("staffCosto.result.lordoMensile")} value={`€ ${fmt(ral / (country === "IT" ? mensilita : 12))}`} sub={country === "IT" ? `x ${mensilita} ${t("staffCosto.result.mensilita")}` : `x 12 + ${vakantiegeldPct}% vak.`} />
              <ResultTile icon={<TrendingUp className="h-5 w-5" />} label={t("staffCosto.result.nettoMensile")} value={`€ ${fmt(summary.nettoMensile)}`} sub={t("staffCosto.result.inTasca")} accent />
              <ResultTile icon={<PiggyBank className="h-5 w-5" />} label={t("staffCosto.result.nettoAnnuo")} value={`€ ${fmt(summary.nettoMensile * 12)}`} sub={t("staffCosto.result.annuo")} accent />
            </div>
          </Card>

          {/* ═══ ITALY-SPECIFIC RESULTS ═══ */}
          {country === "IT" && calcIT && (
            <>
              {/* IRPEF */}
              <Card title={t("staffCosto.irpef.title")} description={t("staffCosto.irpef.desc")}>
                <div className="overflow-x-auto rounded-xl border border-rw-line">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-rw-line bg-rw-surfaceAlt">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.scaglione")}</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.aliquota")}</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.importo")}</th>
                    </tr></thead>
                    <tbody>
                      {(() => { const imp = calcIT.imponibileIrpef; let prev = 0; return IRPEF_BRACKETS.map((b, i) => { const slice = Math.min(imp, b.upto) - prev; if (slice <= 0) return null; const tax = slice * b.rate; prev = b.upto; return (<tr key={i} className="border-b border-rw-line/50"><td className="px-3 py-2 text-rw-ink">{b.upto === Infinity ? `> € 50.000` : `€ 0 – € ${b.upto.toLocaleString("it-IT")}`}</td><td className="px-3 py-2 text-right tabular-nums text-rw-ink">{(b.rate * 100).toFixed(0)}%</td><td className="px-3 py-2 text-right tabular-nums font-semibold text-rw-ink">€ {fmt(tax)}</td></tr>); }).filter(Boolean); })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-rw-line bg-rw-surfaceAlt"><td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.irpef.lorda")}</td><td /><td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calcIT.irpefLorda)}</td></tr>
                      <tr className="bg-rw-surfaceAlt"><td className="px-3 py-2 text-rw-muted">{t("staffCosto.irpef.detrazioni")}</td><td /><td className="px-3 py-2 text-right tabular-nums text-emerald-400">- € {fmt(calcIT.detrazioni)}</td></tr>
                      <tr className="border-t border-rw-line bg-rw-surfaceAlt"><td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.irpef.netta")}</td><td /><td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calcIT.irpefNetta)}</td></tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniStat label={t("staffCosto.irpef.addRegionale")} value={`€ ${fmt(calcIT.addRegAnnua)}`} />
                  <MiniStat label={t("staffCosto.irpef.addComunale")} value={`€ ${fmt(calcIT.addComAnnua)}`} />
                  <MiniStat label={t("staffCosto.irpef.imponibile")} value={`€ ${fmt(calcIT.imponibileIrpef)}`} />
                </div>
              </Card>

              {/* Payslip IT */}
              <Card title={t("staffCosto.bustaPaga.title")} description={t("staffCosto.bustaPaga.desc")}>
                <PayTable rows={[
                  { voce: t("staffCosto.bustaPaga.lordo"), m: calcIT.stipendioLordoMensile, a: ral, bold: true },
                  { voce: `- ${t("staffCosto.bustaPaga.inpsDip")}`, m: -calcIT.inpsDipMensile, a: -calcIT.inpsDipAnnuo },
                  { voce: `- ${t("staffCosto.bustaPaga.irpef")}`, m: -calcIT.irpefMensile, a: -calcIT.irpefNetta },
                  { voce: `- ${t("staffCosto.bustaPaga.addizionali")}`, m: -calcIT.addMensile, a: -calcIT.addTotAnnua },
                ]} footer={{ voce: t("staffCosto.bustaPaga.netto"), m: calcIT.nettoMensile, a: calcIT.nettoAnnuo }} t={t} fmt={fmt} accentFooter />
              </Card>

              {/* Employer cost IT */}
              <Card title={t("staffCosto.costoDatore.title")} description={t("staffCosto.costoDatore.desc")}>
                <PayTable rows={[
                  { voce: t("staffCosto.costoDatore.ral"), m: ral / 12, a: ral },
                  { voce: `+ ${t("staffCosto.costoDatore.inpsDat")}`, m: calcIT.inpsDatoreMensile, a: calcIT.inpsDatoreAnnuo },
                  { voce: `+ ${t("staffCosto.costoDatore.inail")}`, m: calcIT.inailMensile, a: calcIT.inailAnnuo },
                  { voce: `+ ${t("staffCosto.costoDatore.irap")}`, m: calcIT.irapMensile, a: calcIT.irapAnnuo },
                  { voce: `+ ${t("staffCosto.costoDatore.tfr")}`, m: calcIT.tfrMensile, a: calcIT.tfrAnnuo },
                  ...(calcIT.buoniPastoAnnuo > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.buoniPasto")}`, m: calcIT.buoniPastoAnnuo / 12, a: calcIT.buoniPastoAnnuo }] : []),
                  ...(calcIT.fondiTotaliAnnuo > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.fondi")}`, m: calcIT.fondiTotaliMensile, a: calcIT.fondiTotaliAnnuo }] : []),
                  ...(calcIT.costoMalattia > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.malattia")}`, m: calcIT.costoMalattia / 12, a: calcIT.costoMalattia }] : []),
                  ...(altriCosti > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.altriCosti")}`, m: altriCosti / 12, a: altriCosti }] : []),
                ]} footer={{ voce: t("staffCosto.costoDatore.totale"), m: calcIT.costoTotaleMensile, a: calcIT.costoTotaleAnnuo }} t={t} fmt={fmt} dangerFooter />
              </Card>

              {/* KPIs IT */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile icon={<Calculator className="h-5 w-5" />} label={t("staffCosto.kpi.costoOrario")} value={`€ ${fmt(calcIT.costoOrario)}`} color="text-rw-accent" bgColor="bg-rw-accent/10 border-rw-accent/30" />
                <KpiTile icon={<TrendingDown className="h-5 w-5" />} label={t("staffCosto.kpi.cuneo")} value={`${calcIT.cuneoPercentuale.toFixed(1)}%`} color="text-red-400" bgColor="bg-red-500/10 border-red-500/30" />
                <KpiTile icon={<Shield className="h-5 w-5" />} label={t("staffCosto.kpi.tfrAnnuo")} value={`€ ${fmt(calcIT.tfrAnnuo)}`} color="text-amber-400" bgColor="bg-amber-500/10 border-amber-500/30" />
                <KpiTile icon={<Users className="h-5 w-5" />} label={t("staffCosto.kpi.oreEffettive")} value={calcIT.oreEffettive.toFixed(0)} color="text-blue-400" bgColor="bg-blue-500/10 border-blue-500/30" />
              </div>

              {/* Leave costs IT */}
              <Card title={t("staffCosto.ferie.title")} description={t("staffCosto.ferie.desc")}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat label={t("staffCosto.ferie.costoFerie")} value={`€ ${fmt(calcIT.costoFerie)}`} sub={`${ferieGiorni} ${t("staffCosto.ferie.giorni")}`} />
                  <MiniStat label={t("staffCosto.ferie.costoExFest")} value={`€ ${fmt(calcIT.costoExFestivita)}`} sub={`${exFestivita} ${t("staffCosto.ferie.giorni")}`} />
                  <MiniStat label={t("staffCosto.ferie.costoRol")} value={`€ ${fmt(calcIT.costoRol)}`} sub={`${rol} ${t("staffCosto.ferie.ore")}`} />
                </div>
              </Card>
            </>
          )}

          {/* ═══ NETHERLANDS-SPECIFIC RESULTS ═══ */}
          {country === "NL" && calcNL && (
            <>
              {/* Loonheffing / Tax brackets */}
              <Card title={t("staffCosto.nl.loonheffing.title")} description={t("staffCosto.nl.loonheffing.desc")}>
                <div className="overflow-x-auto rounded-xl border border-rw-line">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-rw-line bg-rw-surfaceAlt">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.scaglione")}</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.aliquota")}</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.irpef.importo")}</th>
                    </tr></thead>
                    <tbody>
                      {(() => { const bl = calcNL.belastbaarLoon; let prev = 0; return NL_TAX_BRACKETS.map((b, i) => { const slice = Math.min(bl, b.upto) - prev; if (slice <= 0) return null; const tax = slice * b.rate; prev = b.upto; return (<tr key={i} className="border-b border-rw-line/50"><td className="px-3 py-2 text-rw-ink">{b.upto === Infinity ? `> € 75.518` : `€ 0 – € ${b.upto.toLocaleString("nl-NL")}`}</td><td className="px-3 py-2 text-right tabular-nums text-rw-ink">{(b.rate * 100).toFixed(2)}%</td><td className="px-3 py-2 text-right tabular-nums font-semibold text-rw-ink">€ {fmt(tax)}</td></tr>); }).filter(Boolean); })()}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-rw-line bg-rw-surfaceAlt"><td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.nl.loonheffing.bruto")}</td><td /><td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calcNL.loonheffingBruto)}</td></tr>
                      <tr className="bg-rw-surfaceAlt"><td className="px-3 py-2 text-rw-muted">{t("staffCosto.nl.loonheffing.algKorting")}</td><td /><td className="px-3 py-2 text-right tabular-nums text-emerald-400">- € {fmt(calcNL.algHeffingskorting)}</td></tr>
                      <tr className="bg-rw-surfaceAlt"><td className="px-3 py-2 text-rw-muted">{t("staffCosto.nl.loonheffing.arbKorting")}</td><td /><td className="px-3 py-2 text-right tabular-nums text-emerald-400">- € {fmt(calcNL.arbeidskorting)}</td></tr>
                      <tr className="border-t border-rw-line bg-rw-surfaceAlt"><td className="px-3 py-2 font-bold text-rw-muted">{t("staffCosto.nl.loonheffing.netto")}</td><td /><td className="px-3 py-2 text-right font-bold tabular-nums text-red-400">€ {fmt(calcNL.loonheffingNetto)}</td></tr>
                    </tfoot>
                  </table>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniStat label={t("staffCosto.nl.belastbaarLoon")} value={`€ ${fmt(calcNL.belastbaarLoon)}`} />
                  <MiniStat label={t("staffCosto.nl.vakantiegeldJaar")} value={`€ ${fmt(calcNL.vakantiegeldJaar)}`} />
                  <MiniStat label={t("staffCosto.nl.totaalBruto")} value={`€ ${fmt(calcNL.totaalBrutoJaar)}`} />
                </div>
              </Card>

              {/* Payslip NL */}
              <Card title={t("staffCosto.nl.loonstrook.title")} description={t("staffCosto.nl.loonstrook.desc")}>
                <PayTable rows={[
                  { voce: t("staffCosto.nl.loonstrook.bruto"), m: calcNL.totaalBrutoJaar / 12, a: calcNL.totaalBrutoJaar, bold: true },
                  { voce: `- ${t("staffCosto.nl.loonstrook.pensioenWn")}`, m: -calcNL.pensionEmpJaar / 12, a: -calcNL.pensionEmpJaar },
                  { voce: `- ${t("staffCosto.nl.loonstrook.loonheffing")}`, m: -calcNL.loonheffingMaand, a: -calcNL.loonheffingNetto },
                  { voce: `- ${t("staffCosto.nl.loonstrook.zvwNom")}`, m: -calcNL.zvwNominaal / 12, a: -calcNL.zvwNominaal },
                ]} footer={{ voce: t("staffCosto.bustaPaga.netto"), m: calcNL.nettoMaand, a: calcNL.nettoJaar }} t={t} fmt={fmt} accentFooter />
              </Card>

              {/* Employer cost NL */}
              <Card title={t("staffCosto.costoDatore.title")} description={t("staffCosto.costoDatore.desc")}>
                <PayTable rows={[
                  { voce: t("staffCosto.nl.costoDatore.bruto"), m: ral / 12, a: ral },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.vakantiegeld")}`, m: calcNL.vakantiegeldJaar / 12, a: calcNL.vakantiegeldJaar },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.ww")}`, m: calcNL.wwMaand, a: calcNL.wwJaar },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.whk")}`, m: calcNL.whkMaand, a: calcNL.whkJaar },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.zvw")}`, m: calcNL.zvwWgMaand, a: calcNL.zvwWgJaar },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.pensioenWg")}`, m: calcNL.pensionWgMaand, a: calcNL.pensionWgJaar },
                  { voce: `+ ${t("staffCosto.nl.costoDatore.transitie")}`, m: calcNL.transitieReserveMaand, a: calcNL.transitieReserveJaar },
                  ...(calcNL.buoniPastoAnnuo > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.buoniPasto")}`, m: calcNL.buoniPastoAnnuo / 12, a: calcNL.buoniPastoAnnuo }] : []),
                  ...(calcNL.costoZiekte > 0 ? [{ voce: `+ ${t("staffCosto.nl.costoDatore.ziekte")}`, m: calcNL.costoZiekte / 12, a: calcNL.costoZiekte }] : []),
                  ...(altriCosti > 0 ? [{ voce: `+ ${t("staffCosto.costoDatore.altriCosti")}`, m: altriCosti / 12, a: altriCosti }] : []),
                ]} footer={{ voce: t("staffCosto.costoDatore.totale"), m: calcNL.costoTotaleMaand, a: calcNL.costoTotaleJaar }} t={t} fmt={fmt} dangerFooter />
              </Card>

              {/* KPIs NL */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiTile icon={<Calculator className="h-5 w-5" />} label={t("staffCosto.kpi.costoOrario")} value={`€ ${fmt(calcNL.costoOrario)}`} color="text-rw-accent" bgColor="bg-rw-accent/10 border-rw-accent/30" />
                <KpiTile icon={<TrendingDown className="h-5 w-5" />} label={t("staffCosto.kpi.cuneo")} value={`${calcNL.cuneoPercentuale.toFixed(1)}%`} color="text-red-400" bgColor="bg-red-500/10 border-red-500/30" />
                <KpiTile icon={<Shield className="h-5 w-5" />} label={t("staffCosto.nl.transitieLabel")} value={`€ ${fmt(calcNL.transitieJaar)}`} color="text-amber-400" bgColor="bg-amber-500/10 border-amber-500/30" />
                <KpiTile icon={<Users className="h-5 w-5" />} label={t("staffCosto.kpi.oreEffettive")} value={calcNL.oreEffettive.toFixed(0)} color="text-blue-400" bgColor="bg-blue-500/10 border-blue-500/30" />
              </div>

              {/* Leave costs NL */}
              <Card title={t("staffCosto.ferie.title")} description={t("staffCosto.ferie.desc")}>
                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat label={t("staffCosto.nl.costoVakantie")} value={`€ ${fmt(calcNL.costoVakantie)}`} sub={`${ferieGiorni} ${t("staffCosto.ferie.giorni")}`} />
                  <MiniStat label={t("staffCosto.nl.costoFeestdagen")} value={`€ ${fmt(calcNL.costoFeestdagen)}`} sub={`${nlFeestdagen} ${t("staffCosto.ferie.giorni")}`} />
                  {calcNL.costoAdv > 0 && <MiniStat label={t("staffCosto.nl.costoAdv")} value={`€ ${fmt(calcNL.costoAdv)}`} sub={`${nlAdvDagen} ${t("staffCosto.ferie.giorni")}`} />}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Shared sub-components ═══ */

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

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-rw-line bg-rw-surfaceAlt p-3">
      <p className="text-[10px] font-semibold uppercase text-rw-muted">{label}</p>
      <p className="text-lg font-bold tabular-nums text-rw-ink">{value}</p>
      {sub && <p className="text-[10px] text-rw-muted">{sub}</p>}
    </div>
  );
}

type PayRow = { voce: string; m: number; a: number; bold?: boolean };

function PayTable({ rows, footer, t, fmt, accentFooter, dangerFooter }: { rows: PayRow[]; footer: { voce: string; m: number; a: number }; t: (k: string) => string; fmt: (n: number) => string; accentFooter?: boolean; dangerFooter?: boolean }) {
  const fmtCell = (v: number) => v < 0 ? `- € ${fmt(Math.abs(v))}` : `€ ${fmt(v)}`;
  const footerBorder = dangerFooter ? "border-red-500/30 bg-red-500/5" : "border-rw-accent/30 bg-rw-accent/5";
  const footerText = dangerFooter ? "text-red-400" : "text-rw-accent";

  return (
    <div className="overflow-x-auto rounded-xl border border-rw-line">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-rw-line bg-rw-surfaceAlt">
          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.voce")}</th>
          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.mensile")}</th>
          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-rw-muted">{t("staffCosto.bustaPaga.annuale")}</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.voce} className="border-b border-rw-line/50">
              <td className={cn("px-3 py-2", r.bold ? "font-bold text-rw-ink" : "text-rw-soft")}>{r.voce}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", r.m < 0 ? "text-red-400" : "text-rw-ink")}>{fmtCell(r.m)}</td>
              <td className={cn("px-3 py-2 text-right tabular-nums", r.a < 0 ? "text-red-400" : "text-rw-ink")}>{fmtCell(r.a)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={cn("border-t-2", footerBorder)}>
            <td className={cn("px-3 py-3 font-bold", footerText)}>{footer.voce}</td>
            <td className={cn("px-3 py-3 text-right font-bold tabular-nums", footerText)}>€ {fmt(footer.m)}</td>
            <td className={cn("px-3 py-3 text-right font-bold tabular-nums", footerText)}>€ {fmt(footer.a)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
