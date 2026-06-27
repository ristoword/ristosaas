import {
  Armchair,
  Archive,
  BarChart3,
  BedDouble,
  Bot,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  FileText,
  Globe,
  Grape,
  LayoutDashboard,
  type LucideIcon,
  Mic,
  Monitor,
  Package,
  Pizza,
  QrCode,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Soup,
  Star,
  Truck,
  UserCheck,
  Users,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

export type ManualSection = {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  color: string;
  roles: string[];
  content: ManualBlock[];
};

export type ManualBlock = {
  heading: string;
  body: string;
  tips?: string[];
};
export const SECTIONS: ManualSection[] = [
  /* ── PANORAMICA ──────────────────────────────────── */
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Panoramica (Dashboard)",
    subtitle: "Tutto quello che conta, in un colpo d'occhio.",
    color: "from-blue-500/15 to-blue-400/5",
    roles: ["Tutti i ruoli"],
    content: [
      {
        heading: "Cosa trovi",
        body: "La Dashboard mostra i KPI principali della giornata: ordini attivi, incasso totale, scontrino medio, tavoli occupati, ordini completati e in attesa. Include anche grafici con l'andamento incasso per fascia oraria e lo stato degli ordini.",
      },
      {
        heading: "Come usarla",
        body: "Apri il gestionale — la Dashboard è la prima schermata. Controlla i numeri in alto per capire subito come sta andando il servizio. Il grafico orario ti mostra i picchi di lavoro. In basso trovi gli ordini recenti con stato e importo.",
        tips: [
          "Controlla la Dashboard a inizio e fine servizio per un quadro rapido.",
          "Se lo scontrino medio è basso, valuta promozioni o upselling.",
          "Gli ordini in attesa elevati indicano che la cucina è sotto pressione.",
        ],
      },
    ],
  },

  /* ── AI ASSISTENTE ──────────────────────────────── */
  {
    id: "ai-assistente",
    icon: Bot,
    title: "AI Assistente",
    subtitle: "Assistente intelligente per ogni reparto.",
    color: "from-purple-500/15 to-purple-400/5",
    roles: ["Tutti i ruoli"],
    content: [
      {
        heading: "Cosa fa",
        body: "L'AI Assistente è una chat intelligente che risponde a domande operative in base al reparto in cui ti trovi: cucina, sala, magazzino, cantina, supervisor. Fornisce analisi, suggerimenti e risposte basate sui dati reali del gestionale.",
      },
      {
        heading: "Come usarlo",
        body: "Clicca l'icona AI nella pagina del reparto (es. cucina, magazzino). Si apre un pannello chat dove puoi scrivere domande come \"Quali prodotti stanno per finire?\" o \"Qual è il margine medio del menu?\". L'AI risponde con dati aggiornati.",
        tips: [
          "Fai domande specifiche: \"Quanto guanciale abbiamo?\" è meglio di \"Com'è il magazzino?\".",
          "L'AI conosce stock, prezzi, ordini e ricette — sfruttalo per decisioni rapide.",
          "Disponibile in italiano, inglese, olandese e portoghese.",
        ],
      },
    ],
  },

  /* ── RISTO COMANDI ──────────────────────────────── */
  {
    id: "risto-comandi",
    icon: Mic,
    title: "Risto Comandi (Voce AI)",
    subtitle: "Parla al gestionale: comandi vocali che eseguono azioni reali.",
    color: "from-violet-500/15 to-violet-400/5",
    roles: ["Tutti i ruoli"],
    content: [
      {
        heading: "Cosa fa",
        body: "\"Risto\" è l'assistente vocale che esegue azioni reali nel gestionale. Puoi creare ricette, aggiornare il magazzino, aggiungere vini in cantina, preparare liste ordine e molto altro — tutto parlando o scrivendo.",
      },
      {
        heading: "Comandi principali",
        body: "Esempi di comandi:\n• \"Risto, crea una ricetta per la carbonara con guanciale, uova e pecorino\"\n• \"Risto, segna 10 kg di filetto in magazzino\"\n• \"Risto, carica bolla: 5 kg farina, 3 L olio\"\n• \"Risto, aggiungi un Brunello 2018 a 45 euro\"\n• \"Risto, quanta mozzarella abbiamo?\"\n• \"Risto, prepara lista ordine fornitore\"",
        tips: [
          "Premi il pulsante microfono e parla chiaramente — Risto trascrive e esegue.",
          "Puoi anche scrivere i comandi nella chat.",
          "Risto conferma sempre prima di eseguire azioni importanti.",
          "Funziona meglio con Chrome o Safari (per il riconoscimento vocale).",
        ],
      },
    ],
  },

  /* ── SALA ──────────────────────────────────────── */
  {
    id: "sala",
    icon: Armchair,
    title: "Sala",
    subtitle: "Gestione tavoli, ordini e servizio.",
    color: "from-amber-500/15 to-amber-400/5",
    roles: ["Sala", "Supervisor", "Owner"],
    content: [
      {
        heading: "Planimetria tavoli",
        body: "La vista Sala mostra la mappa dei tavoli organizzata per sale (Sala 1, Terrazza, ecc.). Ogni tavolo mostra lo stato con colore: verde = libero, ambra = occupato, rosso = conto richiesto. Puoi vedere quanti coperti sono occupati e il tempo dall'ultimo ordine.",
      },
      {
        heading: "Aprire un tavolo e inviare ordini",
        body: "Tocca un tavolo libero per occuparlo. Si apre il popup ordine dove puoi: selezionare piatti dal menu (divisi per area: cucina, pizzeria, bar, cantina), cercare per nome, filtrare per categoria. Imposta il numero di coperti e seleziona i piatti. Clicca \"Invia comanda\" — l'ordine arriva direttamente in cucina/bar/pizzeria.",
        tips: [
          "Usa il filtro area per passare velocemente tra cucina, pizzeria, bar e cantina.",
          "I vini della cantina appaiono con badge viola e mostrano annata e produttore.",
          "Puoi aggiungere note speciali per ogni piatto (allergeni, cotture, ecc.).",
          "Il campo ricerca è il modo più veloce per trovare un piatto.",
        ],
      },
      {
        heading: "Sala Fullscreen",
        body: "La versione Fullscreen mostra la mappa tavoli a schermo intero, ideale per tablet appesi in sala o al banco. Include badge in tempo reale con stato tavolo, tempo di attesa e importo ordine.",
      },
      {
        heading: "Gestione comande",
        body: "Dopo aver inviato un ordine puoi: aggiungere altri piatti (secondo giro), richiedere il conto, spostare un tavolo, o annullare piatti. Il cameriere può anche specificare l'ordine dei corsi (antipasto, primo, secondo, dolce).",
      },
    ],
  },

  /* ── CUCINA ──────────────────────────────────────── */
  {
    id: "cucina",
    icon: ChefHat,
    title: "Cucina (KDS)",
    subtitle: "Kitchen Display System — comande in tempo reale.",
    color: "from-orange-500/15 to-orange-400/5",
    roles: ["Cucina", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa mostra",
        body: "La cucina mostra tutte le comande attive in formato card. Ogni card indica: tavolo, ora dell'ordine, piatti da preparare con eventuali note (allergie, cotture speciali), e tempo trascorso. Le card diventano rosse se il tempo supera la soglia.",
      },
      {
        heading: "Flusso di lavoro",
        body: "1. La comanda arriva dalla sala con un suono di notifica.\n2. Lo chef la prende in carico (\"In preparazione\").\n3. Quando i piatti sono pronti, segna come \"Pronto\" — la sala viene notificata.\n4. Il cameriere ritira e la comanda passa a \"Servita\".",
        tips: [
          "Organizza le card per urgenza: quelle rosse (in ritardo) vanno preparate subito.",
          "Usa le note allergie per evitare errori pericolosi.",
          "Il pannello AI cucina analizza i tempi medi e suggerisce ottimizzazioni.",
          "Puoi filtrare per corso (antipasti, primi, secondi, dolci).",
        ],
      },
    ],
  },

  /* ── PIZZERIA ──────────────────────────────────── */
  {
    id: "pizzeria",
    icon: Pizza,
    title: "Pizzeria (KDS)",
    subtitle: "Display comande per la pizzeria.",
    color: "from-red-500/15 to-red-400/5",
    roles: ["Pizzeria", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Identica alla cucina ma filtra solo gli articoli con area \"pizzeria\". Il pizzaiolo vede solo le pizze da preparare, senza confusione con i piatti cucina. Stesso flusso: ricevi → prepara → pronto.",
        tips: [
          "Se hai sia cucina che pizzeria, ogni reparto vede solo i propri piatti.",
          "Le note speciali (senza glutine, doppia mozzarella) sono ben visibili.",
        ],
      },
    ],
  },

  /* ── BAR ──────────────────────────────────────── */
  {
    id: "bar",
    icon: Wine,
    title: "Bar (KDS)",
    subtitle: "Display comande per il bar.",
    color: "from-cyan-500/15 to-cyan-400/5",
    roles: ["Bar", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "KDS dedicato al bar: mostra solo bevande, cocktail e vini della cantina ordinati dalla sala. Il barista prepara e segna come pronto. I vini della cantina ordinati dalla sala arrivano qui con dettagli su annata e produttore.",
        tips: [
          "I vini della cantina ordinati dalla sala vengono instradati al bar automaticamente.",
          "Puoi vedere lo stock residuo dei vini direttamente dalla comanda.",
        ],
      },
    ],
  },

  /* ── CASSA ──────────────────────────────────────── */
  {
    id: "cassa",
    icon: CreditCard,
    title: "Cassa (POS)",
    subtitle: "Conti, pagamenti, chiusure.",
    color: "from-emerald-500/15 to-emerald-400/5",
    roles: ["Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Tab Tavoli",
        body: "Mostra tutti i tavoli con ordini attivi. Per ogni tavolo vedi: importo totale, numero piatti, stato pagamento. Clicca su un tavolo per aprire il dettaglio conto con tutti gli articoli e i prezzi.",
      },
      {
        heading: "Tab Menu",
        body: "Consultazione rapida del menu con tutti i prezzi. Utile quando un cliente chiede informazioni senza ordinare.",
      },
      {
        heading: "Tab Cantina",
        body: "Lista completa dei vini in cantina con prezzi di vendita, produttore, colore e giacenza. Filtrabile per colore (rosso, bianco, rosé, bollicine, ecc.).",
      },
      {
        heading: "Tab Report",
        body: "Report di cassa della giornata: incasso totale, numero coperti, scontrino medio, metodi di pagamento usati.",
        tips: [
          "Controlla il report cassa prima della chiusura serale.",
          "Il tab Cantina permette di verificare prezzi vini senza andare in altra pagina.",
          "Dalla cassa puoi anche emettere storni con motivazione.",
        ],
      },
    ],
  },

  /* ── CHIUSURA Z ──────────────────────────────────── */
  {
    id: "chiusura",
    icon: ScrollText,
    title: "Chiusura Z",
    subtitle: "Chiusura giornaliera e report di fine servizio.",
    color: "from-slate-500/15 to-slate-400/5",
    roles: ["Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "La chiusura Z genera un report completo della giornata: totale incassato, numero ordini, scontrino medio, dettaglio per metodo di pagamento (contanti, carta, ecc.), storni effettuati e differenza cassa. Eseguila a fine servizio per chiudere la giornata contabile.",
        tips: [
          "Esegui la chiusura Z ogni sera prima di spegnere.",
          "Verifica che il totale corrisponda al contante in cassa.",
          "Il report viene archiviato automaticamente nell'Archivio.",
        ],
      },
    ],
  },

  /* ── ASPORTO ──────────────────────────────────── */
  {
    id: "asporto",
    icon: ShoppingBag,
    title: "Asporto",
    subtitle: "Ordini da asporto e consegne a domicilio.",
    color: "from-pink-500/15 to-pink-400/5",
    roles: ["Sala", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Gestisci ordini takeaway separati dal servizio in sala. Crea un nuovo ordine asporto con nome cliente, telefono, orario di ritiro. Seleziona i piatti dal menu e invia in cucina. L'ordine appare nella colonna \"Asporto\" con timer per il ritiro.",
        tips: [
          "Imposta sempre l'orario di ritiro per organizzare la cucina.",
          "Puoi aggiungere note di consegna (indirizzo, citofono, piano).",
          "Gli ordini asporto hanno un badge arancione per distinguerli da quelli in sala.",
        ],
      },
    ],
  },

  /* ── PRENOTAZIONI ──────────────────────────────── */
  {
    id: "prenotazioni",
    icon: ClipboardList,
    title: "Prenotazioni",
    subtitle: "Agenda prenotazioni tavoli.",
    color: "from-indigo-500/15 to-indigo-400/5",
    roles: ["Sala", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Gestisci le prenotazioni dei tavoli: nome cliente, data/ora, numero persone, eventuali note (allergie, compleanni, richieste speciali). L'agenda mostra le prenotazioni del giorno con orario e sala assegnata.",
        tips: [
          "Segna sempre le allergie nella prenotazione — lo chef le vedrà in cucina.",
          "Collega la prenotazione al CRM Clienti per tenere traccia delle visite.",
          "Controlla le prenotazioni del giorno a inizio servizio.",
        ],
      },
    ],
  },

  /* ── MAGAZZINO ──────────────────────────────────── */
  {
    id: "magazzino",
    icon: Package,
    title: "Magazzino",
    subtitle: "Inventario, scorte e movimenti.",
    color: "from-teal-500/15 to-teal-400/5",
    roles: ["Magazzino", "Cucina", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa trovi",
        body: "Il magazzino mostra tutti i prodotti con: nome, categoria, giacenza attuale, unità di misura, scorta minima, costo unitario e fornitore. Un sistema di allerte segnala i prodotti sotto scorta (giallo) e esauriti (rosso).",
      },
      {
        heading: "Operazioni principali",
        body: "• **Aggiungi prodotto**: Nome, categoria, quantità, unità, costo, fornitore.\n• **Carica merce**: Registra l'arrivo di una bolla — aumenta la giacenza.\n• **Scarica merce**: Registra un consumo o una perdita.\n• **Movimenti**: Storico completo di tutti i carichi/scarichi con data, quantità e motivo.",
        tips: [
          "Imposta la scorta minima per ogni prodotto — riceverai allerte automatiche.",
          "Usa \"Carica merce\" quando arriva la bolla del fornitore.",
          "I movimenti sono tracciati con data e operatore per la tracciabilità HACCP.",
          "L'AI magazzino suggerisce ordini automatici per i prodotti sotto scorta.",
          "Puoi anche usare Risto Comandi: \"Risto, carica bolla: 5 kg farina, 3 L olio\".",
        ],
      },
    ],
  },

  /* ── FORNITORI ──────────────────────────────────── */
  {
    id: "fornitori",
    icon: Truck,
    title: "Fornitori",
    subtitle: "Anagrafica fornitori e ordini d'acquisto.",
    color: "from-stone-500/15 to-stone-400/5",
    roles: ["Magazzino", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Gestisci l'anagrafica fornitori con: ragione sociale, indirizzo, telefono, email, P.IVA, condizioni di pagamento e note. Ogni fornitore è collegato ai prodotti del magazzino per tracciare chi fornisce cosa.",
      },
      {
        heading: "Ordini di acquisto",
        body: "Crea ordini di acquisto partendo dai prodotti sotto scorta. Seleziona il fornitore, aggiungi i prodotti con quantità desiderata, e genera l'ordine. Quando la merce arriva, registra il ricevimento per aggiornare il magazzino.",
        tips: [
          "Tieni aggiornati i prezzi dei fornitori per calcoli food cost precisi.",
          "Usa l'archivio ordini fornitore per verificare lo storico acquisti.",
        ],
      },
    ],
  },

  /* ── MENU ADMIN ──────────────────────────────────── */
  {
    id: "menu-admin",
    icon: Soup,
    title: "Menu Admin",
    subtitle: "Gestione piatti, prezzi e categorie.",
    color: "from-orange-500/15 to-orange-400/5",
    roles: ["Cucina", "Sala", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Gestisci il menu del ristorante: aggiungi piatti con nome, prezzo, categoria (antipasti, primi, secondi, dolci, bevande), area di preparazione (cucina, pizzeria, bar) e note. Puoi attivare/disattivare piatti senza eliminarli.",
      },
      {
        heading: "Collegamento ricette",
        body: "Ogni piatto del menu può essere collegato a una ricetta. Questo permette di calcolare automaticamente il food cost, il margine e il prezzo consigliato in base agli ingredienti.",
        tips: [
          "Disattiva i piatti stagionali invece di eliminarli — li riattivi la prossima stagione.",
          "Il codice piatto (es. MNU-CARBONARA) deve essere unico.",
          "Collega ogni piatto a una ricetta per avere il food cost automatico.",
        ],
      },
    ],
  },

  /* ── MENU DEL GIORNO ──────────────────────────── */
  {
    id: "daily-menu",
    icon: Star,
    title: "Menu del Giorno",
    subtitle: "Piatti del giorno — attivazione rapida.",
    color: "from-yellow-500/15 to-yellow-400/5",
    roles: ["Cucina", "Sala", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Crea piatti speciali del giorno che appaiono separati dal menu fisso. Ideale per piatti con ingredienti freschi o proposte giornaliere. Imposta nome, descrizione, prezzo, allergeni e collega opzionalmente una ricetta. Attivali la mattina e disattivali la sera.",
        tips: [
          "Usa il menu del giorno per proporre piatti con ingredienti da consumare rapidamente.",
          "I piatti del giorno appaiono con badge dorato nel popup ordini della sala.",
        ],
      },
    ],
  },

  /* ── FOOD COST ──────────────────────────────────── */
  {
    id: "food-cost",
    icon: FileText,
    title: "Food Cost",
    subtitle: "Calcolo costi, margini e pricing ottimale.",
    color: "from-green-500/15 to-green-400/5",
    roles: ["Cucina", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa mostra",
        body: "Analisi completa del food cost per ogni ricetta: costo ingredienti, costo personale, costo energia, costi di confezionamento, overhead, IVA. Calcola il margine effettivo e suggerisce il prezzo ottimale per raggiungere il target di food cost (tipicamente 25-35%).",
      },
      {
        heading: "Come usarlo",
        body: "Per ogni ricetta vedi: costo totale, prezzo di vendita attuale, margine %, food cost %. Se il food cost supera la soglia, la riga viene evidenziata in rosso. Puoi simulare prezzi diversi per trovare il punto di equilibrio.",
        tips: [
          "Un food cost sopra il 35% è critico — valuta ridurre le porzioni o cambiare fornitore.",
          "Aggiorna i costi degli ingredienti quando cambiano i prezzi del fornitore.",
          "L'AI suggerisce automaticamente prezzi ottimali basati sui margini target.",
        ],
      },
    ],
  },

  /* ── CANTINA ──────────────────────────────────── */
  {
    id: "cantina",
    icon: Grape,
    title: "Cantina",
    subtitle: "Carta dei vini, annate, prezzi e giacenze.",
    color: "from-purple-500/15 to-purple-400/5",
    roles: ["Sala", "Bar", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa gestisce",
        body: "La cantina è il gestionale dei vini: nome, produttore, nazionalità, regione, tipo (rosso, bianco, rosé, bollicine, passito), vitigno, gradi alcolici, annata, prezzo acquisto, prezzo vendita, giacenza (bottiglie), abbinamenti consigliati e note.",
      },
      {
        heading: "Operazioni",
        body: "• **Aggiungi vino**: Tutti i dettagli incluso prezzo acquisto e vendita.\n• **Modifica giacenza**: Aggiorna il numero di bottiglie.\n• **Filtri**: Per colore, paese, ricerca testo.\n• **Pannello AI**: Analisi margini, allerte scorte, suggerimenti prezzo, consigli vendita, allerte annate mature.",
        tips: [
          "I vini con giacenza 0 non appaiono nel popup ordini della sala.",
          "Puoi nascondere il prezzo di acquisto nella vista pubblica.",
          "L'AI cantina analizza i margini e suggerisce ricarichi ottimali.",
          "Usa Risto Comandi: \"Risto, aggiungi un Barolo 2019 a 50 euro\".",
        ],
      },
    ],
  },

  /* ── CATERING ──────────────────────────────────── */
  {
    id: "catering",
    icon: UtensilsCrossed,
    title: "Catering",
    subtitle: "Preset eventi, calcolatore costi e preventivi.",
    color: "from-rose-500/15 to-rose-400/5",
    roles: ["Sala", "Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Gestisci eventi catering: crea preset con menu, numero persone, costo per persona, servizi extra (allestimento, personale, trasporto). Il calcolatore genera automaticamente il preventivo totale con margine desiderato.",
        tips: [
          "Crea preset riutilizzabili per i tipi di evento più frequenti (matrimoni, aziendali, compleanni).",
          "Il calcolatore tiene conto del food cost delle ricette incluse nel menu.",
        ],
      },
    ],
  },

  /* ── STAFF ──────────────────────────────────────── */
  {
    id: "staff",
    icon: Users,
    title: "Staff e Dipendenti",
    subtitle: "Anagrafica, ruoli e accessi sistema.",
    color: "from-blue-500/15 to-blue-400/5",
    roles: ["Supervisor", "Owner"],
    content: [
      {
        heading: "Anagrafica dipendenti",
        body: "Gestisci i dipendenti: nome, ruolo operativo (chef, sous chef, cameriere, barman, ecc.), email, telefono, data assunzione, stipendio, ore settimanali, stato (attivo/inattivo).",
      },
      {
        heading: "Accessi al sistema",
        body: "Ogni dipendente può avere un account per accedere al gestionale. Assegna un ruolo di accesso (sala, cucina, bar, pizzeria, cassa, magazzino, supervisor, reception, ecc.) che determina quali pagine e funzioni può vedere.\n\nCrea l'account con username, password temporanea e ruolo. Al primo accesso verrà chiesto di cambiare la password.",
        tips: [
          "Il ruolo operativo (chef, cameriere) è diverso dal ruolo di accesso (cucina, sala).",
          "Un chef accede con ruolo \"cucina\" e vede solo il KDS e le ricette.",
          "Un cameriere accede con ruolo \"sala\" e vede tavoli e ordini.",
          "Il supervisor vede report e KPI di tutti i reparti.",
          "L'owner ha accesso completo a tutto.",
        ],
      },
    ],
  },

  /* ── TURNI ──────────────────────────────────────── */
  {
    id: "turni",
    icon: CalendarClock,
    title: "Turni",
    subtitle: "Pianificazione turni settimanali e mensili.",
    color: "from-indigo-500/15 to-indigo-400/5",
    roles: ["Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Pianifica i turni del personale con vista settimanale o mensile. Per ogni giorno e dipendente, assegna il turno (mattina, pomeriggio, sera, riposo, ferie). La vista mensile mostra il calendario completo con statistiche ore lavorate per dipendente.",
      },
      {
        heading: "Turni per area",
        body: "I turni sono organizzati per area operativa: cucina, sala, bar, pizzeria. Ogni area ha il proprio calendario. Puoi copiare i turni della settimana precedente per velocizzare la pianificazione.",
        tips: [
          "Pianifica i turni con almeno una settimana di anticipo.",
          "Il sistema mostra le ore totali per dipendente — controlla che non superino il contratto.",
          "I dipendenti vedono i propri turni nella sezione \"Il Mio Profilo\".",
        ],
      },
    ],
  },

  /* ── STAFF HR ──────────────────────────────────── */
  {
    id: "staff-hr",
    icon: UserCheck,
    title: "Staff HR",
    subtitle: "Presenze, ferie, ore e gestione risorse umane.",
    color: "from-sky-500/15 to-sky-400/5",
    roles: ["Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa gestisce",
        body: "Modulo HR completo: presenze giornaliere, calendario ferie con richieste e approvazioni, conteggio ore lavorate, costo del personale, storico assenze (malattia, permessi, ferie). Include anche la gestione disciplinare.",
        tips: [
          "Approva o rifiuta le richieste ferie dal calendario HR.",
          "Il conteggio ore si aggiorna automaticamente dalle timbrature.",
          "Esporta i dati presenze per il consulente del lavoro.",
        ],
      },
    ],
  },

  /* ── CRM CLIENTI ──────────────────────────────── */
  {
    id: "customers",
    icon: Globe,
    title: "CRM Clienti",
    subtitle: "Anagrafica clienti, preferenze e fidelizzazione.",
    color: "from-emerald-500/15 to-emerald-400/5",
    roles: ["Sala", "Cassa", "Reception", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa trovi",
        body: "Il CRM tiene traccia dei clienti: nome, email, telefono, tipo (nuovo, abituale, VIP), numero visite, spesa totale, spesa media, allergie, preferenze, note e data ultima visita.",
      },
      {
        heading: "Come usarlo",
        body: "Aggiungi i clienti abituali con le loro preferenze e allergie. Quando prenotano, il sistema mostra automaticamente le loro info. Puoi segmentare per tipo (VIP, new) e vedere chi non viene da tempo per campagne di richiamo.",
        tips: [
          "Segna SEMPRE le allergie — appariranno automaticamente nelle comande.",
          "I clienti VIP meritano attenzione speciale — controlla le loro preferenze prima del servizio.",
          "Usa la spesa media per identificare i clienti più preziosi.",
        ],
      },
    ],
  },

  /* ── SUPERVISOR ──────────────────────────────────── */
  {
    id: "supervisor",
    icon: BarChart3,
    title: "Supervisor",
    subtitle: "KPI, report e controllo totale sulla gestione.",
    color: "from-amber-500/15 to-amber-400/5",
    roles: ["Supervisor", "Owner"],
    content: [
      {
        heading: "Tab disponibili",
        body: "Il pannello Supervisor ha 7 tab:\n\n1. **Report**: KPI giornalieri — incasso, ordini, scontrino medio, storni, incasso netto, valore magazzino.\n2. **Storico**: Archivio ordini passati con filtri per data.\n3. **Storni**: Lista completa di tutti gli storni con motivo, importo e responsabile.\n4. **Menu**: Consultazione menu con prezzi (sola lettura).\n5. **Cantina**: Tutti i vini con giacenza, prezzi acquisto/vendita, margini.\n6. **Magazzino**: Stato scorte, allerte sottoscorta, valore totale magazzino.\n7. **Report Unificato**: Report completo con trend settimanali e mensili.",
        tips: [
          "Controlla i KPI a inizio e fine servizio.",
          "Monitora gli storni — troppi storni possono indicare problemi operativi.",
          "Il tab Cantina mostra anche il margine % per ogni vino.",
          "Usa il Report Unificato per analisi settimanali con il proprietario.",
        ],
      },
    ],
  },

  /* ── HOTEL DASHBOARD ──────────────────────────── */
  {
    id: "hotel",
    icon: BedDouble,
    title: "Hotel",
    subtitle: "Reception, camere, prenotazioni e servizi ospiti.",
    color: "from-sky-500/15 to-sky-400/5",
    roles: ["Reception", "Hotel Manager", "Housekeeping", "Supervisor", "Owner"],
    content: [
      {
        heading: "Dashboard Hotel",
        body: "Panoramica completa: occupazione camere, arrivi/partenze del giorno, camere da pulire, revenue giornaliero. Include la mappa visiva delle camere con stato (libera, occupata, da pulire, manutenzione).",
      },
      {
        heading: "Camere",
        body: "Gestione di tutte le camere: numero, tipo (classic, deluxe, suite, family), piano, stato, prezzo base. Puoi bloccare camere per manutenzione e impostare note.",
      },
      {
        heading: "Planner Camere",
        body: "Vista calendario mensile in stile PMS: mostra l'occupazione di ogni camera giorno per giorno. Le prenotazioni appaiono come barre colorate. Utile per verificare disponibilità e overbooking.",
      },
      {
        heading: "Prenotazioni Hotel",
        body: "Gestisci le prenotazioni: ospite, date check-in/check-out, tipo camera, tariffa, stato (confermata, check-in, check-out, cancellata). Puoi creare prenotazioni dirette o riceverle da channel manager.",
      },
      {
        heading: "Check-in / Check-out",
        body: "Front desk operativo: lista arrivi del giorno per check-in rapido, lista partenze per check-out. Al check-in puoi assegnare la camera, stampare la tessera, verificare il documento. Al check-out generi il conto finale con tutti gli addebiti.",
      },
      {
        heading: "Housekeeping",
        body: "Lista camere da pulire con priorità (check-out > occupata > libera). L'addetto pulizie aggiorna lo stato direttamente dal tablet. Include richieste di manutenzione.",
      },
      {
        heading: "Guest Folio",
        body: "Conto unico dell'ospite che integra: camera, ristorante, bar, room service, minibar, servizi extra. Tutto addebitato su un unico folio che viene saldato al check-out.",
      },
      {
        heading: "Room Service",
        body: "Gestione richieste in camera: food, lavanderia, minibar, servizi extra. Gli ospiti possono anche ordinare autonomamente scansionando il QR in camera.",
        tips: [
          "Genera i QR per le camere dalla sezione \"QR Camere\" — gli ospiti ordinano dal telefono.",
          "Il folio integrato evita pagamenti multipli — tutto sul conto camera.",
          "Controlla il planner per evitare overbooking prima di confermare prenotazioni.",
          "Housekeeping usa il tablet per aggiornare lo stato pulizia in tempo reale.",
        ],
      },
    ],
  },

  /* ── ARCHIVIO ──────────────────────────────────── */
  {
    id: "archivio",
    icon: Archive,
    title: "Archivio",
    subtitle: "Storico incassi, fatture, comande e ordini fornitore.",
    color: "from-gray-500/15 to-gray-400/5",
    roles: ["Cassa", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa contiene",
        body: "L'archivio conserva tutto lo storico: ordini completati, chiusure giornaliere, fatture emesse, ordini fornitore. Puoi filtrare per data, tavolo, importo e cercare per parola chiave. Include anche l'archivio comande con dettaglio di ogni singola comanda inviata in cucina.",
        tips: [
          "Usa l'archivio per verificare incassi passati o risolvere contestazioni.",
          "L'archivio ordini fornitore è utile per confrontare prezzi nel tempo.",
          "Puoi esportare i dati per il commercialista.",
        ],
      },
    ],
  },

  /* ── HACCP ──────────────────────────────────────── */
  {
    id: "haccp",
    icon: Shield,
    title: "HACCP",
    subtitle: "Sicurezza alimentare e tracciabilità.",
    color: "from-red-500/15 to-red-400/5",
    roles: ["Cucina", "Pizzeria", "Bar", "Magazzino", "Supervisor", "Owner"],
    content: [
      {
        heading: "Cosa gestisce",
        body: "Modulo HACCP integrato: registrazione temperature, controlli pulizia, tracciabilità lotti, scadenze prodotti. Ogni operazione è tracciata con data, ora e operatore per le verifiche ASL.",
        tips: [
          "Registra le temperature dei frigoriferi due volte al giorno (mattina e sera).",
          "Il sistema segnala automaticamente temperature fuori range.",
          "Tutti i movimenti magazzino sono tracciati per la tracciabilità alimentare.",
        ],
      },
    ],
  },

  /* ── QR TAVOLI ──────────────────────────────────── */
  {
    id: "qr-tables",
    icon: QrCode,
    title: "QR Tavoli",
    subtitle: "Genera QR code per menu digitale e ordini autonomi.",
    color: "from-zinc-500/15 to-zinc-400/5",
    roles: ["Supervisor", "Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Genera URL e QR code firmati per ogni tavolo del ristorante. I clienti scansionano il QR con il telefono e possono vedere il menu digitale e inviare ordini direttamente in cucina senza attendere il cameriere.",
        tips: [
          "Stampa i QR e mettili sui tavoli — riduce i tempi di attesa.",
          "I QR sono firmati crittograficamente — non possono essere falsificati.",
          "Il menu digitale si aggiorna automaticamente quando modifichi i piatti.",
        ],
      },
    ],
  },

  /* ── AREA OWNER ──────────────────────────────────── */
  {
    id: "owner",
    icon: Settings,
    title: "Area Owner",
    subtitle: "Configurazione, licenza e impostazioni avanzate.",
    color: "from-amber-500/15 to-amber-400/5",
    roles: ["Owner"],
    content: [
      {
        heading: "Cosa trovi",
        body: "L'area owner contiene: informazioni sulla licenza attiva, configurazione SMTP per email, gestione multi-locale (se hai più ristoranti), impostazioni generali del locale. Da qui puoi anche gestire il portfolio se hai più strutture.",
        tips: [
          "Verifica la scadenza licenza periodicamente.",
          "Configura l'SMTP per inviare email ai clienti (conferme prenotazione, promozioni).",
          "Se gestisci più locali, usa il portfolio per passare da uno all'altro.",
        ],
      },
    ],
  },

  /* ── HARDWARE ──────────────────────────────────── */
  {
    id: "hardware",
    icon: Monitor,
    title: "Hardware / Stampa",
    subtitle: "Configurazione stampanti e display KDS.",
    color: "from-neutral-500/15 to-neutral-400/5",
    roles: ["Owner"],
    content: [
      {
        heading: "Come funziona",
        body: "Configura le stampanti per le comande (cucina, bar, pizzeria, cassa) e i display KDS. Ogni area può avere la propria stampante. Supporta stampanti termiche di rete e USB.",
        tips: [
          "Testa sempre la stampante dopo la configurazione.",
          "Usa display KDS invece delle stampanti per ridurre sprechi di carta.",
        ],
      },
    ],
  },

  /* ── SESSIONI ──────────────────────────────────── */
  {
    id: "sessions",
    icon: Shield,
    title: "Sessioni",
    subtitle: "Gestione sessioni attive e sicurezza accesso.",
    color: "from-slate-500/15 to-slate-400/5",
    roles: ["Tutti i ruoli"],
    content: [
      {
        heading: "Come funziona",
        body: "Visualizza tutte le tue sessioni attive: dispositivo, IP, ultimo accesso. Puoi revocare sessioni singole (es. se hai dimenticato un accesso su un altro dispositivo) per motivi di sicurezza.",
        tips: [
          "Se noti una sessione sospetta, revocala immediatamente.",
          "Disconnettiti sempre dai dispositivi condivisi a fine turno.",
        ],
      },
    ],
  },
];

export const QUICK_START = [
  { step: "1", title: "Accedi al gestionale", desc: "Vai su login, inserisci username e password. Al primo accesso ti verrà chiesto di cambiare la password." },
  { step: "2", title: "Controlla la Dashboard", desc: "Verifica i KPI del giorno: ordini attivi, incasso, tavoli occupati." },
  { step: "3", title: "Apri la Sala", desc: "Tocca un tavolo → imposta coperti → seleziona piatti → Invia comanda." },
  { step: "4", title: "La cucina prepara", desc: "Lo chef vede la comanda sul KDS → la prepara → segna Pronto." },
  { step: "5", title: "Chiudi il conto", desc: "Dalla Cassa, seleziona il tavolo → verifica il conto → incassa." },
  { step: "6", title: "Chiusura Z", desc: "A fine servizio, esegui la chiusura Z per il report giornaliero." },
];

export const ROLE_GUIDE = [
  { role: "Cameriere (Sala)", pages: "Sala, Sala Fullscreen, Prenotazioni, Asporto", color: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  { role: "Chef (Cucina)", pages: "Cucina KDS, Ricette, Menu Admin, Food Cost, Magazzino, HACCP", color: "border-orange-500/30 bg-orange-500/10 text-orange-400" },
  { role: "Pizzaiolo", pages: "Pizzeria KDS", color: "border-red-500/30 bg-red-500/10 text-red-400" },
  { role: "Barman (Bar)", pages: "Bar KDS, Cantina", color: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400" },
  { role: "Cassiere (Cassa)", pages: "Cassa, Chiusura Z, Archivio", color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  { role: "Magazziniere", pages: "Magazzino, Fornitori, HACCP", color: "border-teal-500/30 bg-teal-500/10 text-teal-400" },
  { role: "Supervisor", pages: "Supervisor, Staff, Turni, HR, + tutto il ristorante", color: "border-purple-500/30 bg-purple-500/10 text-purple-400" },
  { role: "Reception (Hotel)", pages: "Hotel Dashboard, Camere, Prenotazioni, Check-in/out, Folio", color: "border-sky-500/30 bg-sky-500/10 text-sky-400" },
  { role: "Housekeeping", pages: "Housekeeping, I miei incarichi", color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400" },
  { role: "Owner", pages: "Tutto — accesso completo a tutte le funzioni", color: "border-rw-accent/30 bg-rw-accent/10 text-rw-accent" },
];
