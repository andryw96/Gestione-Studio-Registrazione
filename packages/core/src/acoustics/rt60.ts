import { assertValidRoom, roomVolume, surfaceAreas, totalSurface } from "./geometry";
import { schroederFrequency } from "./modes";
import {
  BANDS_HZ,
  SURFACE_KINDS,
  type AlphaByBand,
  type BandHz,
  type RT60Input,
  type SurfaceKind,
} from "./types";

/** Costante di Sabine con c = 343 m/s: 24·ln(10)/c ≈ 0,161 */
export const SABINE_CONSTANT = 0.161;

/**
 * Coefficienti m (1/m) di assorbimento dell'aria, valori INDICATIVI a circa 20 °C e 50% UR
 * (ordine di grandezza da ISO 9613-1). Usati solo se includeAirAbsorption = true.
 */
export const AIR_ABSORPTION_APPROX: AlphaByBand = {
  125: 0,
  250: 0,
  500: 0.0006,
  1000: 0.0011,
  2000: 0.0024,
  4000: 0.0070,
};

export type RT60Warning =
  | { code: "treatment_exceeds_surface"; surface: SurfaceKind; requestedM2: number; availableM2: number }
  | { code: "invalid_treatment"; id: string; message: string };

export interface SurfaceResult {
  areaM2: number;
  coveredM2: number;
  effectiveAlpha: AlphaByBand;
}

export interface BandResult {
  bandHz: BandHz;
  /** Assorbimento equivalente totale A (m², sabin metrici), aria esclusa */
  absorptionM2: number;
  /** Coefficiente medio ᾱ = A / S */
  meanAlpha: number;
  sabineS: number;
  eyringS: number;
}

export interface RT60Result {
  volumeM3: number;
  surfaceM2: number;
  surfaces: Record<SurfaceKind, SurfaceResult>;
  bands: BandResult[];
  /** Frequenza di Schroeder calcolata con T60 Eyring a 500 Hz */
  schroederHz: number;
  warnings: RT60Warning[];
}

const emptyAlpha = (): AlphaByBand => ({ 125: 0, 250: 0, 500: 0, 1000: 0, 2000: 0, 4000: 0 });

export function computeRT60(input: RT60Input): RT60Result {
  assertValidRoom(input.room);
  const V = roomVolume(input.room);
  const areas = surfaceAreas(input.room);
  const S = totalSurface(input.room);
  const warnings: RT60Warning[] = [];

  // Raggruppa i trattamenti per superficie; quelli liberi si sommano a parte
  const bySurface = new Map<SurfaceKind, typeof input.treatments>();
  const free: typeof input.treatments = [];
  for (const t of input.treatments) {
    if (!(t.areaM2 >= 0) || !Number.isFinite(t.areaM2)) {
      warnings.push({ code: "invalid_treatment", id: t.id, message: "Area non valida" });
      continue;
    }
    if (t.surface === null) free.push(t);
    else bySurface.set(t.surface, [...(bySurface.get(t.surface) ?? []), t]);
  }

  const surfaces = {} as Record<SurfaceKind, SurfaceResult>;
  for (const kind of SURFACE_KINDS) {
    const area = areas[kind];
    const list = bySurface.get(kind) ?? [];
    const requested = list.reduce((s, t) => s + t.areaM2, 0);
    // Se i trattamenti superano la superficie, vengono ridotti in proporzione
    const scale = requested > area ? area / requested : 1;
    if (requested > area) {
      warnings.push({ code: "treatment_exceeds_surface", surface: kind, requestedM2: requested, availableM2: area });
    }
    const covered = Math.min(requested, area);
    const eff = emptyAlpha();
    for (const b of BANDS_HZ) {
      const treated = list.reduce((s, t) => s + t.areaM2 * scale * t.alpha[b], 0);
      eff[b] = (treated + (area - covered) * input.baseAlpha[kind][b]) / area;
    }
    surfaces[kind] = { areaM2: area, coveredM2: covered, effectiveAlpha: eff };
  }

  const bands: BandResult[] = BANDS_HZ.map((b) => {
    let A = 0;
    for (const kind of SURFACE_KINDS) A += surfaces[kind].areaM2 * surfaces[kind].effectiveAlpha[b];
    for (const t of free) A += t.areaM2 * t.alpha[b];

    const air = input.includeAirAbsorption ? 4 * AIR_ABSORPTION_APPROX[b] * V : 0;
    const meanAlpha = A / S;
    const clamped = Math.min(meanAlpha, 0.999);
    const sabineS = (SABINE_CONSTANT * V) / (A + air);
    const eyringS = (SABINE_CONSTANT * V) / (-S * Math.log(1 - clamped) + air);
    return { bandHz: b, absorptionM2: A, meanAlpha, sabineS, eyringS };
  });

  const t500 = bands.find((x) => x.bandHz === 500)!.eyringS;
  return { volumeM3: V, surfaceM2: S, surfaces, bands, schroederHz: schroederFrequency(t500, V), warnings };
}

export const uniformAlpha = (a: number): AlphaByBand => ({ 125: a, 250: a, 500: a, 1000: a, 2000: a, 4000: a });
