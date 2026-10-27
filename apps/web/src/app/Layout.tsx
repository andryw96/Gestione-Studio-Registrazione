import { MODULES } from "@studio/core";
import { NavLink, Outlet } from "react-router-dom";
import { useTheme, type ThemeMode } from "./theme";

export function Layout() {
  const { mode, setMode } = useTheme();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">🎚 Studio Manager</div>
        {MODULES.map((m) => (
          <NavLink key={m.id} to={m.path} end={m.path === "/"} className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
            <span>{m.label}</span>
            {m.status === "planned" && <span className="nav-tag">presto</span>}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          <label className="field">
            Tema
            <select value={mode} onChange={(e) => setMode(e.target.value as ThemeMode)}>
              <option value="system">Sistema</option>
              <option value="light">Chiaro</option>
              <option value="dark">Scuro</option>
            </select>
          </label>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
