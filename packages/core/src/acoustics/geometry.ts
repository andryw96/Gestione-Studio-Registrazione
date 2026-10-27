import { SURFACE_KINDS, type RoomDims, type SurfaceKind } from "./types";

export function assertValidRoom(room: RoomDims): void {
  const { lengthM, widthM, heightM } = room;
  for (const [name, v] of [
    ["lengthM", lengthM],
    ["widthM", widthM],
    ["heightM", heightM],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0) {
      throw new RangeError(`${name} deve essere un numero positivo (ricevuto ${v})`);
    }
  }
}

export const roomVolume = (r: RoomDims): number => r.lengthM * r.widthM * r.heightM;

export function surfaceAreas(r: RoomDims): Record<SurfaceKind, number> {
  const floor = r.lengthM * r.widthM;
  return {
    floor,
    ceiling: floor,
    wall_north: r.widthM * r.heightM,
    wall_south: r.widthM * r.heightM,
    wall_east: r.lengthM * r.heightM,
    wall_west: r.lengthM * r.heightM,
  };
}

export function totalSurface(r: RoomDims): number {
  const a = surfaceAreas(r);
  return SURFACE_KINDS.reduce((sum, k) => sum + a[k], 0);
}

/** Velocità del suono in aria (m/s) in funzione della temperatura in °C. */
export const speedOfSound = (temperatureC = 20): number => 331.3 + 0.606 * temperatureC;
