import type { ModuleDef } from "@studio/core";

export function ComingSoonPage({ module: m }: { module: ModuleDef }) {
  return (
    <>
      <h1>
        {m.label} <span className="badge planned">predisposto</span>
      </h1>
      <p className="lead">{m.description}</p>
      <div className="card">
        <h2>Funzioni previste</h2>
        <ul className="plain">{m.planned?.map((p) => <li key={p}>{p}</li>)}</ul>
        <p className="muted" style={{ marginTop: 12 }}>
          Route, voce di menu e tabelle del database sono già pronte: il modulo si attiva senza modifiche strutturali.
        </p>
      </div>
    </>
  );
}
