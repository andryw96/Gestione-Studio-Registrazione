# Studio Manager

Gestionale all-in-one per studio di registrazione. Uso in **rete locale** con più utenti: un server Node + PostgreSQL
sul mini-PC dello studio, interfaccia web raggiungibile dagli altri PC.

## Stato dei moduli

| Modulo | Stato | Note |
| --- | --- | --- |
| Acustica | **attivo** | Modi normali ≤ 300 Hz, cluster e degenerazioni, RT60 Sabine/Eyring, superfici miste, trattamenti |
| Dashboard | **attivo** | Elenco moduli |
| Booking, Finanza, Magazzino, Clienti, Planimetria, Stage plot | predisposti | Route, voce di menu e tabelle già presenti; pagina segnaposto |

Backend attivo: `POST /api/acoustics/compute`, `GET/POST /api/clients`, `GET/POST /api/sessions`
(la creazione di una sessione risponde `409` se sala o fonico sono già occupati, grazie al vincolo del database).

## Avvio

```bash
npm install
cp .env.example .env
npm run db:up         # PostgreSQL in Docker
npm run db:generate   # genera la migrazione dallo schema Drizzle (la prima volta e a ogni modifica allo schema)
npm run db:migrate    # applica migrazioni + vincoli (packages/db/sql/constraints.sql)
npm run dev:server    # API su :3001
npm run dev:web       # interfaccia su :5173 (raggiungibile in LAN)
npm test              # test del pacchetto core
```

La pagina Acustica funziona anche senza database (stato salvato nel browser); il server senza `DATABASE_URL` espone solo il calcolo acustico.

## Struttura

```text
apps/web/src/features/<modulo>/   # pages, components, hooks (un modulo = una cartella)
apps/server/src/routes/           # una route per area
packages/core/                    # funzioni pure: acustica, regole di booking, registro moduli
packages/db/                      # schema Drizzle completo + sql/constraints.sql
```

## Attivare un modulo predisposto

1. In `packages/core/src/modules.ts` porta il modulo a `status: "ready"`.
2. Crea la pagina in `apps/web/src/features/<modulo>/` e registrala in `apps/web/src/app/routes.tsx`.
3. Aggiungi le route in `apps/server/src/routes/` e registrale in `apps/server/src/index.ts`.

Le tabelle sono già nello schema: di norma non servono migrazioni strutturali.

## Da fare / decisioni aperte

- Autenticazione e ruoli (tabella `app_user` pronta, ruoli owner/engineer/admin; nessun controllo attivo ancora).
- Sale: per ora tabella semplice `room_resource` (nome, tipo, colore), estendibile.
- Materiali acustici: i coefficienti α di partenza sono **indicativi di letteratura**, non certificati. Sostituirli con schede tecniche o misure ISO 354.
- Fattura elettronica: il modulo finanza produrrà documenti PDF; la fattura valida per legge (XML FatturaPA via SDI) richiede un intermediario, da concordare con il commercialista.
- Stile: per ora CSS con token Dark/Light; Tailwind + shadcn/ui possono essere aggiunti senza toccare la logica.
