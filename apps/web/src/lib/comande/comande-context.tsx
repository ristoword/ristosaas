"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { Comanda, CorsoRiga, InviaComandaInput, StatoCorso } from "./types";
import { comandaApertaSuTavolo, tuttiCorsiCompletati } from "./types";

type Stato = {
  attive: Comanda[];
  archivio: Comanda[];
};

const initial: Stato = { attive: [], archivio: [] };

type Azione =
  | { type: "INVIA"; payload: InviaComandaInput }
  | { type: "ESCE"; comandaId: string }
  | { type: "MARCIA"; comandaId: string }
  | { type: "PRIORITA"; comandaId: string };

function nuoviCorsi(n: number): CorsoRiga[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `corso-${crypto.randomUUID()}`,
    ordine: i + 1,
    stato: (i === 0 ? "attivo" : "attesa") as StatoCorso,
  }));
}

function riduci(stato: Stato, azione: Azione): Stato {
  switch (azione.type) {
    case "INVIA": {
      const { payload } = azione;
      const blocca = stato.attive.some(
        (c) => c.tavoloId === payload.tavoloId && comandaApertaSuTavolo(c),
      );
      if (blocca) return stato;

      const c: Comanda = {
        id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tavoloId: payload.tavoloId,
        tavoloNome: payload.tavoloNome,
        coperti: payload.coperti,
        corsi: nuoviCorsi(payload.numCorsi),
        noteCucina: payload.noteCucina,
        notePizzeria: payload.notePizzeria,
        noteBar: payload.noteBar,
        priorita: false,
        createdAt: Date.now(),
      };
      return { ...stato, attive: [c, ...stato.attive] };
    }
    case "ESCE": {
      const idx = stato.attive.findIndex((c) => c.id === azione.comandaId);
      if (idx === -1) return stato;
      const comanda = stato.attive[idx];
      const corsi = comanda.corsi.map((c) =>
        c.stato === "attivo" ? { ...c, stato: "completato" as const } : c,
      );
      const agg = { ...comanda, corsi };
      if (tuttiCorsiCompletati(agg)) {
        const archiviata: Comanda = {
          ...agg,
          archivedAt: Date.now(),
        };
        const attive = [...stato.attive];
        attive.splice(idx, 1);
        return {
          attive,
          archivio: [archiviata, ...stato.archivio],
        };
      }
      const attive = [...stato.attive];
      attive[idx] = agg;
      return { ...stato, attive };
    }
    case "MARCIA": {
      const idx = stato.attive.findIndex((c) => c.id === azione.comandaId);
      if (idx === -1) return stato;
      const comanda = stato.attive[idx];
      const haAttivo = comanda.corsi.some((c) => c.stato === "attivo");
      if (haAttivo) return stato;
      const iAttesa = comanda.corsi.findIndex((c) => c.stato === "attesa");
      if (iAttesa === -1) return stato;
      const corsi = comanda.corsi.map((c, i) =>
        i === iAttesa ? { ...c, stato: "attivo" as const } : c,
      );
      const attive = [...stato.attive];
      attive[idx] = { ...comanda, corsi };
      return { ...stato, attive };
    }
    case "PRIORITA": {
      const idx = stato.attive.findIndex((c) => c.id === azione.comandaId);
      if (idx === -1) return stato;
      const attive = [...stato.attive];
      attive[idx] = {
        ...attive[idx],
        priorita: !attive[idx].priorita,
      };
      return { ...stato, attive };
    }
    default:
      return stato;
  }
}

type Valore = {
  attive: Comanda[];
  archivio: Comanda[];
  inviaComanda: (p: InviaComandaInput) => { ok: true } | { ok: false; motivo: string };
  corsoEsce: (comandaId: string) => void;
  marcia: (comandaId: string) => void;
  marciaPerTavolo: (tavoloId: string) => { ok: true } | { ok: false; motivo: string };
  togglePriorita: (comandaId: string) => void;
  comandaAttivaPerTavolo: (tavoloId: string) => Comanda | undefined;
};

const ComandeContext = createContext<Valore | null>(null);

export function ComandeProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(riduci, initial);

  const inviaComanda = useCallback((p: InviaComandaInput) => {
    const blocca = s.attive.some(
      (c) => c.tavoloId === p.tavoloId && comandaApertaSuTavolo(c),
    );
    if (blocca) {
      return {
        ok: false as const,
        motivo:
          "Su questo tavolo c’è già una comanda in cucina. Aspetta che finisca tutti i corsi (archivio) prima di inviarne un’altra.",
      };
    }
    if (p.numCorsi < 1) {
      return { ok: false as const, motivo: "Imposta almeno un corso." };
    }
    dispatch({ type: "INVIA", payload: p });
    return { ok: true as const };
  }, [s.attive]);

  const corsoEsce = useCallback((comandaId: string) => {
    dispatch({ type: "ESCE", comandaId });
  }, []);

  const marcia = useCallback((comandaId: string) => {
    dispatch({ type: "MARCIA", comandaId });
  }, []);

  const marciaPerTavolo = useCallback(
    (tavoloId: string) => {
      const c = s.attive.find(
        (x) => x.tavoloId === tavoloId && comandaApertaSuTavolo(x),
      );
      if (!c) {
        return {
          ok: false as const,
          motivo: "Nessuna comanda attiva per questo tavolo.",
        };
      }
      dispatch({ type: "MARCIA", comandaId: c.id });
      return { ok: true as const };
    },
    [s.attive],
  );

  const togglePriorita = useCallback((comandaId: string) => {
    dispatch({ type: "PRIORITA", comandaId });
  }, []);

  const comandaAttivaPerTavolo = useCallback(
    (tavoloId: string) =>
      s.attive.find((x) => x.tavoloId === tavoloId && comandaApertaSuTavolo(x)),
    [s.attive],
  );

  const value = useMemo<Valore>(
    () => ({
      attive: s.attive,
      archivio: s.archivio,
      inviaComanda,
      corsoEsce,
      marcia,
      marciaPerTavolo,
      togglePriorita,
      comandaAttivaPerTavolo,
    }),
    [
      s.attive,
      s.archivio,
      inviaComanda,
      corsoEsce,
      marcia,
      marciaPerTavolo,
      togglePriorita,
      comandaAttivaPerTavolo,
    ],
  );

  return (
    <ComandeContext.Provider value={value}>{children}</ComandeContext.Provider>
  );
}

export function useComande() {
  const v = useContext(ComandeContext);
  if (!v) throw new Error("useComande va usato dentro ComandeProvider");
  return v;
}
