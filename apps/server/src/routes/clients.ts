import { schema, type Db } from "@studio/db";
import { isNull } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createClient = z.object({
  type: z.enum(["person", "company"]).default("person"),
  name: z.string().min(1),
  vatNumber: z.string().optional(),
  taxCode: z.string().optional(),
  pec: z.string().email().optional(),
  sdiCode: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const clientRoutes =
  (db: Db): FastifyPluginAsync =>
  async (app) => {
    app.get("/", async () => db.select().from(schema.client).where(isNull(schema.client.deletedAt)));

    app.post("/", async (req, reply) => {
      const parsed = createClient.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
      const [row] = await db.insert(schema.client).values(parsed.data).returning();
      return reply.code(201).send(row);
    });
  };
