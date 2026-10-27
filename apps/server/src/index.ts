import cors from "@fastify/cors";
import { createDb } from "@studio/db";
import Fastify from "fastify";
import { acousticsRoutes } from "./routes/acoustics";
import { clientRoutes } from "./routes/clients";
import { sessionRoutes } from "./routes/sessions";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/api/health", async () => ({ ok: true }));

// Il calcolo acustico è puro: funziona anche senza database.
await app.register(acousticsRoutes, { prefix: "/api/acoustics" });

// I moduli con dati persistenti si registrano solo se il database è configurato.
if (process.env.DATABASE_URL) {
  const { db } = createDb();
  await app.register(clientRoutes(db), { prefix: "/api/clients" });
  await app.register(sessionRoutes(db), { prefix: "/api/sessions" });
} else {
  app.log.warn("DATABASE_URL non impostata: attivi solo gli endpoint di calcolo acustico.");
}

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
await app.listen({ port, host });
