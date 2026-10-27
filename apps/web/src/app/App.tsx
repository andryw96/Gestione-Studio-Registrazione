import { MODULES } from "@studio/core";
import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";
import { pageFor } from "./routes";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {MODULES.map((m) => (
          <Route key={m.id} path={m.path === "/" ? undefined : `${m.path}/*`} index={m.path === "/"} element={pageFor(m)} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
