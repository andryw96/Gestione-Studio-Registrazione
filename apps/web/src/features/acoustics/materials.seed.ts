import type { AlphaByBand } from "@studio/core";

export interface MaterialDef {
  id: string;
  name: string;
  category: string;
  alpha: AlphaByBand;
  isVerified: boolean;
  source: string;
}

const SRC =
  "Valore indicativo di letteratura (tabelle di manuale). Sostituire con i dati della scheda tecnica o con misure ISO 354.";

const a = (...v: [number, number, number, number, number, number]): AlphaByBand => ({
  125: v[0],
  250: v[1],
  500: v[2],
  1000: v[3],
  2000: v[4],
  4000: v[5],
});

/**
 * Materiali di partenza, bande 125, 250, 500, 1k, 2k, 4k Hz.
 * NON sono dati certificati: isVerified = false finché non vengono confrontati con una fonte.
 * I materiali personalizzati (scheda tecnica del produttore) vanno aggiunti nel database.
 */
export const MATERIAL_SEED: MaterialDef[] = [
  { id: "concrete", name: "Calcestruzzo / intonaco dipinto", category: "Strutture", alpha: a(0.01, 0.01, 0.01, 0.02, 0.02, 0.02), isVerified: false, source: SRC },
  { id: "glass", name: "Vetro (finestra)", category: "Strutture", alpha: a(0.35, 0.25, 0.18, 0.12, 0.07, 0.04), isVerified: false, source: SRC },
  { id: "gypsum", name: "Cartongesso su intercapedine", category: "Strutture", alpha: a(0.29, 0.1, 0.05, 0.04, 0.07, 0.09), isVerified: false, source: SRC },
  { id: "wood-floor", name: "Parquet su massetto", category: "Pavimenti", alpha: a(0.15, 0.11, 0.1, 0.07, 0.06, 0.07), isVerified: false, source: SRC },
  { id: "carpet", name: "Moquette pesante su cemento", category: "Pavimenti", alpha: a(0.02, 0.06, 0.14, 0.37, 0.6, 0.65), isVerified: false, source: SRC },
  { id: "door", name: "Porta in legno", category: "Strutture", alpha: a(0.14, 0.1, 0.06, 0.08, 0.1, 0.1), isVerified: false, source: SRC },
  { id: "drape", name: "Tenda pesante drappeggiata", category: "Tessili", alpha: a(0.14, 0.35, 0.55, 0.72, 0.7, 0.65), isVerified: false, source: SRC },
  { id: "porous-50", name: "Pannello poroso, lana minerale 50 mm", category: "Trattamenti", alpha: a(0.2, 0.65, 0.95, 1, 1, 1), isVerified: false, source: SRC },
  { id: "porous-100", name: "Pannello poroso, lana minerale 100 mm", category: "Trattamenti", alpha: a(0.45, 0.95, 1, 1, 1, 1), isVerified: false, source: SRC },
];

export const materialById = (id: string): MaterialDef => {
  const m = MATERIAL_SEED.find((x) => x.id === id);
  if (!m) throw new Error(`Materiale sconosciuto: ${id}`);
  return m;
};
