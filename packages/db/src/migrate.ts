import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createDb } from "./client";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const constraintsFile = fileURLToPath(new URL("../sql/constraints.sql", import.meta.url));

const { db, pool } = createDb();
await migrate(db, { migrationsFolder });
// Vincoli non esprimibili nello schema Drizzle (EXCLUDE anti-sovrapposizione, CHECK, trigger)
await pool.query(await readFile(constraintsFile, "utf8"));
console.log("Migrazioni e vincoli applicati.");
await pool.end();
