import type { SurfaceKind } from "@studio/core";
import { MATERIAL_SEED } from "../materials.seed";

export interface TreatmentRow {
  id: string;
  surface: SurfaceKind | null;
  materialId: string;
  areaM2: number;
}

export const SURFACE_LABEL: Record<SurfaceKind, string> = {
  floor: "Pavimento",
  ceiling: "Soffitto",
  wall_north: "Parete nord",
  wall_south: "Parete sud",
  wall_east: "Parete est",
  wall_west: "Parete ovest",
};

interface Props {
  rows: TreatmentRow[];
  onChange: (rows: TreatmentRow[]) => void;
}

export function TreatmentsEditor({ rows, onChange }: Props) {
  const update = (id: string, patch: Partial<TreatmentRow>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const add = () =>
    onChange([...rows, { id: crypto.randomUUID(), surface: "wall_east", materialId: "porous-50", areaM2: 2 }]);

  return (
    <div>
      {rows.length === 0 && <p className="muted">Nessun trattamento. Aggiungi pannelli o bass trap per vedere l'effetto sul T60.</p>}
      {rows.map((r) => (
        <div key={r.id} className="row" style={{ marginBottom: 8 }}>
          <select value={r.surface ?? "free"} onChange={(e) => update(r.id, { surface: e.target.value === "free" ? null : (e.target.value as SurfaceKind) })} aria-label="Superficie">
            {(Object.keys(SURFACE_LABEL) as SurfaceKind[]).map((k) => (
              <option key={k} value={k}>
                {SURFACE_LABEL[k]}
              </option>
            ))}
            <option value="free">Oggetto libero</option>
          </select>
          <select value={r.materialId} onChange={(e) => update(r.id, { materialId: e.target.value })} aria-label="Materiale" style={{ flex: 1 }}>
            {MATERIAL_SEED.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input type="number" min={0} step={0.1} value={r.areaM2} onChange={(e) => update(r.id, { areaM2: Number(e.target.value) })} style={{ width: 72 }} aria-label="Area in metri quadrati" />
          <span className="muted">m²</span>
          <button className="ghost" onClick={() => onChange(rows.filter((x) => x.id !== r.id))} aria-label="Rimuovi">
            ✕
          </button>
        </div>
      ))}
      <button onClick={add}>+ Aggiungi trattamento</button>
    </div>
  );
}
