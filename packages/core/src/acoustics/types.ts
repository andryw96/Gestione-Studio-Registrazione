export const BANDS_HZ = [125, 250, 500, 1000, 2000, 4000] as const;
export type BandHz = (typeof BANDS_HZ)[number];
export type AlphaByBand = Record<BandHz, number>;

export const SURFACE_KINDS = [
  "floor",
  "ceiling",
  "wall_north",
  "wall_south",
  "wall_east",
  "wall_west",
] as const;
export type SurfaceKind = (typeof SURFACE_KINDS)[number];

/**
 * Convenzione geometrica (stanza rettangolare):
 * - lunghezza L lungo l'asse Nord-Sud, larghezza W lungo Est-Ovest, altezza H verticale
 * - pareti nord/sud: L'area è W × H (affacciate lungo la larghezza)
 * - pareti est/ovest: area L × H
 */
export interface RoomDims {
  lengthM: number;
  widthM: number;
  heightM: number;
  temperatureC?: number;
}

export interface TreatmentInput {
  id: string;
  /** Superficie su cui è applicato; null = oggetto libero (area efficace di assorbimento) */
  surface: SurfaceKind | null;
  areaM2: number;
  alpha: AlphaByBand;
  label?: string;
}

export interface RT60Input {
  room: RoomDims;
  baseAlpha: Record<SurfaceKind, AlphaByBand>;
  treatments: TreatmentInput[];
  /** Include il termine 4mV di assorbimento dell'aria (default false) */
  includeAirAbsorption?: boolean;
}

export type ModeType = "axial" | "tangential" | "oblique";

export interface Mode {
  n: [number, number, number];
  fHz: number;
  type: ModeType;
  weight: number;
}
