import { MODULES } from "@studio/core";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const modules = MODULES.filter((m) => m.id !== "dashboard");
  return (
    <>
      <h1>Studio Manager</h1>
      <p className="lead">
        Gestionale all-in-one dello studio. I moduli attivi sono pronti all'uso; quelli predisposti hanno già route, menu e tabelle
        nel database e si attivano uno alla volta.
      </p>
      <div className="grid-cards">
        {modules.map((m) => (
          <Link key={m.id} to={m.path} className="card" style={{ color: "inherit", marginBottom: 0 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{m.label}</strong>
              <span className={`badge ${m.status}`}>{m.status === "ready" ? "attivo" : "predisposto"}</span>
            </div>
            <p className="muted" style={{ margin: "8px 0 0" }}>
              {m.description}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}
