import { schema, type Db } from "@studio/db";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createSession = z
  .object({
    projectId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    type: z.enum(["recording", "mixing", "mastering", "rehearsal", "other"]).default("recording"),
    title: z.string().optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    roomIds: z.array(z.string().uuid()).default([]),
    staffIds: z.array(z.string().uuid()).default([]),
    notes: z.string().optional(),
  })
  .refine((v) => v.endAt > v.startAt, { message: "endAt deve essere successivo a startAt", path: ["endAt"] });

/** Il codice 23P01 (exclusion_violation) può essere sul driver o annidato in `cause`. */
function isExclusionViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}

export const sessionRoutes =
  (db: Db): FastifyPluginAsync =>
  async (app) => {
    app.get("/", async (req) => {
      const q = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).parse(req.query);
      const conds = [];
      if (q.from) conds.push(gt(schema.session.endAt, q.from));
      if (q.to) conds.push(lt(schema.session.startAt, q.to));
      return db
        .select()
        .from(schema.session)
        .where(conds.length ? and(...conds) : undefined);
    });

    app.post("/", async (req, reply) => {
      const parsed = createSession.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
      const { roomIds, staffIds, ...data } = parsed.data;

      try {
        const created = await db.transaction(async (tx) => {
          const [s] = await tx.insert(schema.session).values(data).returning();
          if (roomIds.length) {
            await tx
              .insert(schema.sessionRoom)
              .values(roomIds.map((roomId) => ({ sessionId: s!.id, roomId, startAt: data.startAt, endAt: data.endAt })));
          }
          if (staffIds.length) {
            await tx
              .insert(schema.sessionStaff)
              .values(
                staffIds.map((staffId) => ({ sessionId: s!.id, staffId, startAt: data.startAt, endAt: data.endAt })),
              );
          }
          return s!;
        });
        return reply.code(201).send(created);
      } catch (e) {
        if (!isExclusionViolation(e)) throw e;
        // Il vincolo del database ha rifiutato la prenotazione: indichiamo chi occupa lo slot
        const rooms = roomIds.length
          ? await db
              .select()
              .from(schema.sessionRoom)
              .where(
                and(
                  inArray(schema.sessionRoom.roomId, roomIds),
                  eq(schema.sessionRoom.active, true),
                  lt(schema.sessionRoom.startAt, data.endAt),
                  gt(schema.sessionRoom.endAt, data.startAt),
                ),
              )
          : [];
        const staff = staffIds.length
          ? await db
              .select()
              .from(schema.sessionStaff)
              .where(
                and(
                  inArray(schema.sessionStaff.staffId, staffIds),
                  eq(schema.sessionStaff.active, true),
                  lt(schema.sessionStaff.startAt, data.endAt),
                  gt(schema.sessionStaff.endAt, data.startAt),
                ),
              )
          : [];
        return reply.code(409).send({ error: "booking_conflict", rooms, staff });
      }
    });
  };
