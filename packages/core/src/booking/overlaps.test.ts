import { describe, expect, it } from "vitest";
import { findConflicts, overlaps } from "./overlaps";

const d = (h: number) => new Date(Date.UTC(2026, 9, 28, h));

describe("overlaps", () => {
  it("intervalli semiaperti: un turno che inizia quando l'altro finisce non confligge", () => {
    expect(overlaps({ start: d(10), end: d(12) }, { start: d(12), end: d(14) })).toBe(false);
  });
  it("rileva la sovrapposizione parziale e quella totale", () => {
    expect(overlaps({ start: d(10), end: d(13) }, { start: d(12), end: d(14) })).toBe(true);
    expect(overlaps({ start: d(10), end: d(18) }, { start: d(12), end: d(14) })).toBe(true);
  });
  it("findConflicts considera solo la stessa risorsa e ignora se stessa", () => {
    const existing = [
      { id: "a", resourceId: "regia", start: d(10), end: d(14) },
      { id: "b", resourceId: "live", start: d(10), end: d(14) },
    ];
    const cand = { id: "c", resourceId: "regia", start: d(13), end: d(16) };
    expect(findConflicts(cand, existing).map((x) => x.id)).toEqual(["a"]);
    expect(findConflicts({ ...cand, id: "a" }, existing)).toEqual([]);
  });
});
