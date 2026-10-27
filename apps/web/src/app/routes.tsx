import type { ModuleDef } from "@studio/core";
import type { ReactElement } from "react";
import { AcousticsPage } from "../features/acoustics";
import { DashboardPage } from "../features/dashboard";
import { ComingSoonPage } from "../shared/ComingSoonPage";

/**
 * Per attivare un modulo predisposto:
 * 1. porta il suo `status` a "ready" in packages/core/src/modules.ts
 * 2. crea la pagina in features/<modulo>/ e registrala qui sotto
 */
const PAGES: Record<string, () => ReactElement> = {
  dashboard: () => <DashboardPage />,
  acoustics: () => <AcousticsPage />,
};

export const pageFor = (m: ModuleDef): ReactElement => PAGES[m.id]?.() ?? <ComingSoonPage module={m} />;
