import {
  analyzeModes,
  computeModes,
  computeRT60,
  SURFACE_KINDS,
  speedOfSound,
  surfaceAreas,
  type RoomDims,
  type SurfaceKind,
} from "@studio/core";
import { useMemo } from "react";
import { useStoredState } from "../../../shared/useStoredState";
import { ModesChart } from "../components/ModesChart";
import { RT60Panel } from "../components/RT60Panel";
import { SURFACE_LABEL, TreatmentsEditor, type TreatmentRow } from "../components/TreatmentsEditor";
import { MATERIAL_SEED, materialById } from "../materials.seed";

interface State {
  room: RoomDims;
  includeAir: boolean;
  base: Record<SurfaceKind, string>;
  treatments: TreatmentRow[];
  target: { min: number; max: number };
}

const INITIAL: State = {
  room: { lengthM: 5, widthM: 4, heightM: 3, temperatureC: 20 },
  includeAir: false,
  base: {
    floor: "wood-floor",
    ceiling: "gypsum",
    wall_north: "concrete",
    wall_south: "concrete",
    wall_east: "concrete",
    wall_west: "concrete",
  },
  treatments: [],
  target: { min: 0.2, max: 0.4 },
};

const MAX_HZ = 300;

export function AcousticsPage() {
  const [s, setS] = useStoredState<State>("studio.acoustics.v1", INITIAL);
  const { room } = s;
  const valid = room.lengthM > 0 && room.widthM > 0 && room.heightM > 0;

  const setRoom = (patch: Partial<RoomDims>) => setS({ ...s, room: { ...room, ...patch } });

  const calc = useMemo(() => {
    if (!valid) return null;
    const modes = computeModes(room, { maxHz: MAX_HZ });
    const analysis = analyzeModes(modes);
    const rt60 = computeRT60({
      room,
      includeAirAbsorption: s.includeAir,
      baseAlpha: Object.fromEntries(SURFACE_KINDS.map((k) => [k, materialById(s.base[k]).alpha])) as Record<
        SurfaceKind,
        ReturnType<typeof materialById>["alpha"]
      >,
      treatments: s.treatments.map((t) => ({
        id: t.id,
        surface: t.surface,
        areaM2: Number.isFinite(t.areaM2) ? t.areaM2 : 0,
        alpha: materialById(t.materialId).alpha,
      })),
    });
    return { modes, analysis, rt60 };
  }, [valid, room, s.includeAir, s.base, s.treatments]);

  const areas = valid ? surfaceAreas(room) : null;
  const num = (v: string) => Number(v);

  return (
    <>
      <h1>Acustica</h1>
      <p className="lead">
        Modi normali fino a {MAX_HZ} Hz e tempo di riverberazione (Sabine ed Eyring) con trattamenti per superficie. I risultati si
        aggiornano mentre modifichi i dati.
      </p>

      <div className="grid-2">
        <div>
          <div className="card">
            <h2>Stanza</h2>
            <div className="fields-3">
              <label className="field">
                L (m)
                <input type="number" min={0.5} step={0.05} value={room.lengthM} onChange={(e) => setRoom({ lengthM: num(e.target.value) })} />
              </label>
              <label className="field">
                W (m)
                <input type="number" min={0.5} step={0.05} value={room.widthM} onChange={(e) => setRoom({ widthM: num(e.target.value) })} />
              </label>
              <label className="field">
                H (m)
                <input type="number" min={0.5} step={0.05} value={room.heightM} onChange={(e) => setRoom({ heightM: num(e.target.value) })} />
              </label>
            </div>
            <label className="field">
              Temperatura (°C) · c = {speedOfSound(room.temperatureC ?? 20).toFixed(1)} m/s
              <input type="number" step={1} value={room.temperatureC ?? 20} onChange={(e) => setRoom({ temperatureC: num(e.target.value) })} />
            </label>
            <label className="row" style={{ fontSize: 13 }}>
              <input type="checkbox" checked={s.includeAir} onChange={(e) => setS({ ...s, includeAir: e.target.checked })} />
              Includi assorbimento dell'aria (valori indicativi)
            </label>
          </div>

          <div className="card">
            <h2>Materiale di base delle superfici</h2>
            {SURFACE_KINDS.map((k) => (
              <label key={k} className="field">
                {SURFACE_LABEL[k]}
                {areas ? ` · ${areas[k].toFixed(1)} m²` : ""}
                <select value={s.base[k]} onChange={(e) => setS({ ...s, base: { ...s.base, [k]: e.target.value } })}>
                  {MATERIAL_SEED.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="muted" style={{ fontSize: 12 }}>
              I coefficienti α dei materiali di partenza sono valori indicativi di letteratura, non dati certificati.
            </p>
          </div>

          <div className="card">
            <h2>Trattamenti</h2>
            <TreatmentsEditor rows={s.treatments} onChange={(treatments) => setS({ ...s, treatments })} />
          </div>

          <div className="card">
            <h2>Fascia obiettivo T60 (s)</h2>
            <div className="row">
              <input type="number" step={0.05} min={0} value={s.target.min} onChange={(e) => setS({ ...s, target: { ...s.target, min: num(e.target.value) } })} aria-label="Minimo" />
              <span>–</span>
              <input type="number" step={0.05} min={0} value={s.target.max} onChange={(e) => setS({ ...s, target: { ...s.target, max: num(e.target.value) } })} aria-label="Massimo" />
            </div>
            <p className="muted" style={{ fontSize: 12 }}>
              Valore indicativo per una regia di ascolto; regola in base al tipo di locale.
            </p>
          </div>
        </div>

        <div>
          {!calc && <div className="notice danger">Inserisci dimensioni positive per L, W e H.</div>}
          {calc && (
            <>
              <div className="card">
                <div className="stat">
                  <span className="muted">Volume</span>
                  <b>{calc.rt60.volumeM3.toFixed(1)} m³</b>
                </div>
                <div className="stat">
                  <span className="muted">Superficie</span>
                  <b>{calc.rt60.surfaceM2.toFixed(1)} m²</b>
                </div>
                <div className="stat">
                  <span className="muted">Frequenza di Schroeder</span>
                  <b>{calc.rt60.schroederHz.toFixed(0)} Hz</b>
                </div>
                <div className="stat">
                  <span className="muted">Modi ≤ {MAX_HZ} Hz</span>
                  <b>{calc.modes.length}</b>
                </div>
              </div>

              {calc.rt60.warnings.map((w, i) => (
                <div key={i} className="notice">
                  {w.code === "treatment_exceeds_surface"
                    ? `${SURFACE_LABEL[w.surface]}: i trattamenti (${w.requestedM2.toFixed(1)} m²) superano la superficie (${w.availableM2.toFixed(1)} m²); l'area è stata ridotta in proporzione.`
                    : `Trattamento non valido: ${w.message}`}
                </div>
              ))}
              {calc.rt60.schroederHz > 125 && (
                <div className="notice">
                  La frequenza di Schroeder ({calc.rt60.schroederHz.toFixed(0)} Hz) supera la banda a 125 Hz: lì il campo non è diffuso e il T60 è
                  solo indicativo.
                </div>
              )}

              <div className="card">
                <h2>Modi normali</h2>
                <ModesChart modes={calc.modes} analysis={calc.analysis} maxHz={MAX_HZ} />
                <div className="row" style={{ gap: 16, flexWrap: "wrap", marginTop: 8 }}>
                  <span className="badge">{calc.analysis.clusters.length} cluster critici</span>
                  <span className="badge">{calc.analysis.degenerate.length} degenerazioni</span>
                  <span className="badge">{calc.analysis.gaps.length} vuoti sotto 100 Hz</span>
                </div>
                {calc.analysis.clusters.length > 0 && (
                  <ul className="plain" style={{ marginTop: 8 }}>
                    {calc.analysis.clusters.map((cl) => (
                      <li key={cl.fromHz}>
                        {cl.fromHz.toFixed(1)}–{cl.toHz.toFixed(1)} Hz: {cl.modes.length} modi (punteggio {cl.score.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h2>Tempo di riverberazione</h2>
                <RT60Panel result={calc.rt60} target={s.target} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
