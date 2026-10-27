import { assertValidRoom, speedOfSound } from "./geometry";
import type { Mode, ModeType, RoomDims } from "./types";

export const DEFAULT_MODE_WEIGHTS: Record<ModeType, number> = {
  axial: 1,
  tangential: 0.5,
  oblique: 0.25,
};

export interface ComputeModesOptions {
  maxHz?: number;
  /** Sovrascrive la velocità del suono (m/s); altrimenti deriva dalla temperatura */
  speedMps?: number;
  weights?: Record<ModeType, number>;
}

/**
 * Frequenze di risonanza di una stanza rettangolare rigida:
 * f = c/2 · sqrt((nx/L)² + (ny/W)² + (nz/H)²), esclusa la terna (0,0,0).
 */
export function computeModes(room: RoomDims, opts: ComputeModesOptions = {}): Mode[] {
  assertValidRoom(room);
  const maxHz = opts.maxHz ?? 300;
  const c = opts.speedMps ?? speedOfSound(room.temperatureC ?? 20);
  const weights = opts.weights ?? DEFAULT_MODE_WEIGHTS;

  const nMax = (dim: number) => Math.floor((2 * maxHz * dim) / c);
  const nxMax = nMax(room.lengthM);
  const nyMax = nMax(room.widthM);
  const nzMax = nMax(room.heightM);

  const modes: Mode[] = [];
  for (let nx = 0; nx <= nxMax; nx++) {
    for (let ny = 0; ny <= nyMax; ny++) {
      for (let nz = 0; nz <= nzMax; nz++) {
        if (nx === 0 && ny === 0 && nz === 0) continue;
        const f =
          (c / 2) *
          Math.sqrt((nx / room.lengthM) ** 2 + (ny / room.widthM) ** 2 + (nz / room.heightM) ** 2);
        if (f > maxHz) continue;
        const nonZero = (nx > 0 ? 1 : 0) + (ny > 0 ? 1 : 0) + (nz > 0 ? 1 : 0);
        const type: ModeType = nonZero === 1 ? "axial" : nonZero === 2 ? "tangential" : "oblique";
        modes.push({ n: [nx, ny, nz], fHz: f, type, weight: weights[type] });
      }
    }
  }
  return modes.sort((a, b) => a.fHz - b.fHz);
}

export interface ModeAnalysisOptions {
  /** Differenza massima (Hz) per considerare due modi degeneri. Default 1 */
  degeneracyHz?: number;
  /** Ampiezza della finestra scorrevole per i cluster (Hz). Default 5 */
  clusterWindowHz?: number;
  /** Numero minimo di modi (con almeno un assiale) per un cluster critico. Default 3 */
  clusterMinModes?: number;
  /** Vuoto spettrale: intervallo più largo di questo valore (Hz). Default 25 */
  gapMaxHz?: number;
  /** I vuoti si cercano sotto questa frequenza (Hz). Default 100 */
  gapBelowHz?: number;
  /** Frequenza iniziale per la ricerca dei vuoti (Hz). Default 20 */
  gapFromHz?: number;
}

export interface DegenerateGroup {
  fromHz: number;
  toHz: number;
  modes: Mode[];
}
export interface Cluster {
  fromHz: number;
  toHz: number;
  modes: Mode[];
  score: number;
}
export interface Gap {
  fromHz: number;
  toHz: number;
}
export interface ModeAnalysis {
  degenerate: DegenerateGroup[];
  clusters: Cluster[];
  gaps: Gap[];
}

export function analyzeModes(modes: Mode[], opts: ModeAnalysisOptions = {}): ModeAnalysis {
  const degTol = opts.degeneracyHz ?? 1;
  const win = opts.clusterWindowHz ?? 5;
  const minModes = opts.clusterMinModes ?? 3;
  const gapMax = opts.gapMaxHz ?? 25;
  const gapBelow = opts.gapBelowHz ?? 100;
  const gapFrom = opts.gapFromHz ?? 20;
  const sorted = [...modes].sort((a, b) => a.fHz - b.fHz);

  // Degenerazioni: catene di modi con differenza consecutiva <= tolleranza
  const degenerate: DegenerateGroup[] = [];
  let group: Mode[] = [];
  const flush = () => {
    if (group.length >= 2) {
      degenerate.push({
        fromHz: group[0]!.fHz,
        toHz: group[group.length - 1]!.fHz,
        modes: group,
      });
    }
    group = [];
  };
  for (const m of sorted) {
    const last = group[group.length - 1];
    if (last && m.fHz - last.fHz <= degTol) group.push(m);
    else {
      flush();
      group = [m];
    }
  }
  flush();

  // Cluster: finestre scorrevoli con >= minModes modi e almeno un assiale, poi unione
  const ranges: { from: number; to: number }[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i]!.fHz;
    const inWin = sorted.filter((m) => m.fHz >= start && m.fHz <= start + win);
    if (inWin.length >= minModes && inWin.some((m) => m.type === "axial")) {
      ranges.push({ from: start, to: inWin[inWin.length - 1]!.fHz });
    }
  }
  const merged: { from: number; to: number }[] = [];
  for (const r of ranges) {
    const prev = merged[merged.length - 1];
    if (prev && r.from <= prev.to) prev.to = Math.max(prev.to, r.to);
    else merged.push({ ...r });
  }
  const clusters: Cluster[] = merged.map((r) => {
    const ms = sorted.filter((m) => m.fHz >= r.from && m.fHz <= r.to);
    return {
      fromHz: r.from,
      toHz: r.to,
      modes: ms,
      score: ms.reduce((s, m) => s + m.weight, 0),
    };
  });

  // Vuoti spettrali sotto gapBelow
  const points = [gapFrom, ...sorted.map((m) => m.fHz).filter((f) => f > gapFrom && f < gapBelow), gapBelow];
  const gaps: Gap[] = [];
  for (let i = 1; i < points.length; i++) {
    if (points[i]! - points[i - 1]! > gapMax) gaps.push({ fromHz: points[i - 1]!, toHz: points[i]! });
  }

  return { degenerate, clusters, gaps };
}

/** Numero di modi per intervallo di ampiezza binHz, da 0 a maxHz. */
export function modeDensity(modes: Mode[], binHz = 10, maxHz = 300): { fromHz: number; count: number }[] {
  const bins = Math.ceil(maxHz / binHz);
  const out = Array.from({ length: bins }, (_, i) => ({ fromHz: i * binHz, count: 0 }));
  for (const m of modes) {
    const idx = Math.min(bins - 1, Math.floor(m.fHz / binHz));
    out[idx]!.count++;
  }
  return out;
}

/** Frequenza di Schroeder: fs = 2000·sqrt(T60/V) */
export const schroederFrequency = (t60S: number, volumeM3: number): number =>
  2000 * Math.sqrt(t60S / volumeM3);
