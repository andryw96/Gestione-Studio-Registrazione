/**
 * Registro dei moduli dell'applicazione.
 * `ready`   = implementato e attivo
 * `planned` = predisposto (route, voce di menu, tabelle), da implementare in seguito
 *
 * Per attivare un modulo basta portarlo a `ready` e sostituire la pagina segnaposto
 * con quella reale in apps/web/src/app/routes.tsx.
 */
export type ModuleStatus = "ready" | "planned";

export interface ModuleDef {
  id: string;
  label: string;
  path: string;
  status: ModuleStatus;
  description: string;
  /** Funzioni previste, mostrate nella pagina segnaposto */
  planned?: string[];
}

export const MODULES: ModuleDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/",
    status: "ready",
    description: "Panoramica dello studio.",
  },
  {
    id: "booking",
    label: "Booking",
    path: "/booking",
    status: "planned",
    description: "Calendario di regie, live room e turni dei fonici, senza sovrapposizioni.",
    planned: [
      "Vista giorno/settimana per sala e per fonico",
      "Sessioni di registrazione, mixaggio e masterizzazione",
      "Anteprima conflitti e vincolo anti-sovrapposizione nel database (già predisposto)",
      "Turni dei fonici e assenze",
    ],
  },
  {
    id: "finance",
    label: "Finanza",
    path: "/finanza",
    status: "planned",
    description: "Entrate, uscite, preventivi convertibili in fattura, grafici e export.",
    planned: [
      "Movimenti e categorie, acquisti di materiale collegati all'attrezzatura",
      "Grafici a ciambella con hover (categoria, importo, percentuale)",
      "Preventivi → fatture con numerazione progressiva",
      "Export PDF su modulo di spesa, CSV ed Excel",
    ],
  },
  {
    id: "inventory",
    label: "Magazzino",
    path: "/magazzino",
    status: "planned",
    description: "Attrezzatura, cablaggio e patchbay, noleggi e DDT.",
    planned: [
      "Catalogo: nome, produttore, seriale, prezzo, data d'acquisto, fornitore, tipologia",
      "Stato dei cavi, connessioni e routing della patchbay",
      "Noleggi con date di uscita e rientro, DDT in PDF",
    ],
  },
  {
    id: "crm",
    label: "Clienti",
    path: "/clienti",
    status: "planned",
    description: "Anagrafica, storico sessioni e stato pagamenti per progetto.",
    planned: ["Anagrafica clienti e progetti", "Storico sessioni", "Fatturato, incassato e residuo per progetto"],
  },
  {
    id: "floorplan",
    label: "Planimetria",
    path: "/planimetria",
    status: "planned",
    description: "Pianta 2D dello studio con griglia e libreria di elementi trascinabili.",
    planned: [
      "Canvas con griglia millimetrata o magnetica",
      "Arredi, rack, monitor, casse, pannelli fonoassorbenti",
      "Sincronizzazione bidirezionale con il calcolatore acustico",
    ],
  },
  {
    id: "acoustics",
    label: "Acustica",
    path: "/acustica",
    status: "ready",
    description: "Modi normali e RT60 (Sabine ed Eyring) con trattamenti per superficie.",
  },
  {
    id: "stageplot",
    label: "Stage plot",
    path: "/stage-plot",
    status: "planned",
    description: "Stage plot visivi per live ed ensemble, con input list collegata.",
    planned: ["Palco in scala con elementi da palco", "Input list sincronizzata", "Export PDF A4 orizzontale"],
  },
];
