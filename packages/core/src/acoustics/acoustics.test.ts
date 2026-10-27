import { describe, expect, it } from "vitest";
import {
  analyzeModes,
  computeModes,
  computeRT60,
  modeDensity,
  schroederFrequency,
  SURFACE_KINDS,
  uniformAlpha,
  type RT60Input,
  type SurfaceKind,
} from "./index";

const flatAlpha = (a: number) =>
  Object.fromEntries(SURFACE_KINDS.map((k) => [k, uniformAlpha(a)])) as RT60Input["baseAlpha"];

describe("modi normali", () => {
  it("il primo assiale lungo L vale c/(2L)", () => {
    const modes = computeModes({ lengthM: 5, widthM: 4, heightM: 3 }, { speedMps: 343 });
    const first = modes[0]!;
    expect(first.n).toEqual([1, 0, 0]);
    expect(first.fHz).toBeCloseTo(34.3, 5);
    expect(first.type).toBe("axial");
  });

  it("classifica assiali, tangenziali e oblique", () => {
    const modes = computeModes({ lengthM: 5, widthM: 4, heightM: 3 }, { speedMps: 343 });
    const find = (n: [number, number, number]) => modes.find((m) => m.n.join() === n.join())!;
    expect(find([2, 0, 0]).type).toBe("axial");
    expect(find([1, 1, 0]).type).toBe("tangential");
    expect(find([1, 1, 1]).type).toBe("oblique");
    expect(find([1, 1, 0]).fHz).toBeCloseTo((343 / 2) * Math.sqrt(1 / 25 + 1 / 16), 8);
  });

  it("non supera la frequenza massima", () => {
    const modes = computeModes({ lengthM: 6, widthM: 4.5, heightM: 3 }, { maxHz: 300 });
    expect(modes.every((m) => m.fHz <= 300)).toBe(true);
    expect(modes.length).toBeGreaterThan(20);
  });

  it("la stanza cubica ha una degenerazione tripla sui primi modi assiali", () => {
    const modes = computeModes({ lengthM: 3, widthM: 3, heightM: 3 }, { speedMps: 343 });
    const analysis = analyzeModes(modes);
    const first = analysis.degenerate[0]!;
    expect(first.modes.length).toBe(3);
    expect(first.fromHz).toBeCloseTo(343 / 6, 8);
  });

  it("rileva un cluster critico e i vuoti spettrali", () => {
    const modes = computeModes({ lengthM: 3, widthM: 3, heightM: 3 }, { speedMps: 343 });
    const analysis = analyzeModes(modes);
    expect(analysis.clusters.length).toBeGreaterThan(0);
    expect(analysis.clusters[0]!.modes.some((m) => m.type === "axial")).toBe(true);
    // Primo modo a 57 Hz: vuoto tra 20 Hz e 57 Hz (> 25 Hz)
    expect(analysis.gaps[0]!.fromHz).toBe(20);
  });

  it("la densità conta tutti i modi", () => {
    const modes = computeModes({ lengthM: 5, widthM: 4, heightM: 3 });
    const total = modeDensity(modes, 10, 300).reduce((s, b) => s + b.count, 0);
    expect(total).toBe(modes.length);
  });

  it("rifiuta dimensioni non valide", () => {
    expect(() => computeModes({ lengthM: 0, widthM: 4, heightM: 3 })).toThrow(RangeError);
  });
});

describe("RT60", () => {
  const room = { lengthM: 5, widthM: 4, heightM: 3 }; // V = 60, S = 94

  it("Sabine ed Eyring con alpha uniforme 0,1", () => {
    const r = computeRT60({ room, baseAlpha: flatAlpha(0.1), treatments: [] });
    expect(r.volumeM3).toBeCloseTo(60, 8);
    expect(r.surfaceM2).toBeCloseTo(94, 8);
    const b = r.bands[0]!;
    expect(b.absorptionM2).toBeCloseTo(9.4, 8);
    expect(b.sabineS).toBeCloseTo((0.161 * 60) / 9.4, 8);
    expect(b.eyringS).toBeCloseTo((0.161 * 60) / (-94 * Math.log(0.9)), 8);
    expect(b.eyringS).toBeLessThan(b.sabineS);
  });

  it("superfici miste: media pesata sull'area", () => {
    const base = flatAlpha(0.1);
    const r = computeRT60({
      room,
      baseAlpha: base,
      treatments: [{ id: "t1", surface: "floor", areaM2: 10, alpha: uniformAlpha(0.9) }],
    });
    // pavimento 20 m²: (10·0,1 + 10·0,9)/20 = 0,5
    expect(r.surfaces.floor.effectiveAlpha[500]).toBeCloseTo(0.5, 8);
    expect(r.surfaces.floor.coveredM2).toBe(10);
  });

  it("aggiungere trattamenti riduce il T60", () => {
    const before = computeRT60({ room, baseAlpha: flatAlpha(0.1), treatments: [] });
    const after = computeRT60({
      room,
      baseAlpha: flatAlpha(0.1),
      treatments: [{ id: "p", surface: "wall_east", areaM2: 6, alpha: uniformAlpha(0.95) }],
    });
    for (let i = 0; i < before.bands.length; i++) {
      expect(after.bands[i]!.sabineS).toBeLessThan(before.bands[i]!.sabineS);
      expect(after.bands[i]!.eyringS).toBeLessThan(before.bands[i]!.eyringS);
    }
  });

  it("area oltre la superficie: avviso e riduzione proporzionale", () => {
    const r = computeRT60({
      room,
      baseAlpha: flatAlpha(0.1),
      treatments: [{ id: "x", surface: "floor", areaM2: 50, alpha: uniformAlpha(1) }],
    });
    expect(r.warnings.some((w) => w.code === "treatment_exceeds_surface")).toBe(true);
    expect(r.surfaces.floor.coveredM2).toBe(20);
    expect(r.surfaces.floor.effectiveAlpha[500]).toBeCloseTo(1, 8);
  });

  it("oggetti liberi aggiungono assorbimento senza ridurre le superfici", () => {
    const r0 = computeRT60({ room, baseAlpha: flatAlpha(0.1), treatments: [] });
    const r1 = computeRT60({
      room,
      baseAlpha: flatAlpha(0.1),
      treatments: [{ id: "g", surface: null, areaM2: 2, alpha: uniformAlpha(1) }],
    });
    expect(r1.bands[0]!.absorptionM2).toBeCloseTo(r0.bands[0]!.absorptionM2 + 2, 8);
    expect(r1.surfaces.floor.coveredM2).toBe(0);
  });

  it("assorbimento dell'aria allunga meno il T60 alle alte frequenze", () => {
    const base = flatAlpha(0.1);
    const without = computeRT60({ room, baseAlpha: base, treatments: [] });
    const withAir = computeRT60({ room, baseAlpha: base, treatments: [], includeAirAbsorption: true });
    expect(withAir.bands[5]!.sabineS).toBeLessThan(without.bands[5]!.sabineS);
    expect(withAir.bands[0]!.sabineS).toBeCloseTo(without.bands[0]!.sabineS, 10);
  });

  it("frequenza di Schroeder", () => {
    expect(schroederFrequency(0.5, 50)).toBeCloseTo(2000 * Math.sqrt(0.01), 8);
  });
});

describe("tipi", () => {
  it("SurfaceKind copre 6 superfici", () => {
    const kinds: SurfaceKind[] = [...SURFACE_KINDS];
    expect(kinds).toHaveLength(6);
  });
});
