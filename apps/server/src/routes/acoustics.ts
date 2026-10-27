import { analyzeModes, computeModes, computeRT60, modeDensity } from "@studio/core";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const alpha = z.number().min(0).max(1.2);
const alphaByBand = z.object({ 125: alpha, 250: alpha, 500: alpha, 1000: alpha, 2000: alpha, 4000: alpha });
const surface = z.enum(["floor", "ceiling", "wall_north", "wall_south", "wall_east", "wall_west"]);

const room = z.object({
  lengthM: z.number().positive().max(100),
  widthM: z.number().positive().max(100),
  heightM: z.number().positive().max(30),
  temperatureC: z.number().min(-20).max(50).optional(),
});

const body = z.object({
  room,
  maxHz: z.number().min(20).max(1000).default(300),
  baseAlpha: z.object({
    floor: alphaByBand,
    ceiling: alphaByBand,
    wall_north: alphaByBand,
    wall_south: alphaByBand,
    wall_east: alphaByBand,
    wall_west: alphaByBand,
  }),
  treatments: z
    .array(z.object({ id: z.string(), surface: surface.nullable(), areaM2: z.number().min(0), alpha: alphaByBand }))
    .default([]),
  includeAirAbsorption: z.boolean().default(false),
});

export const acousticsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/compute", async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_input", issues: parsed.error.issues });
    const { room, maxHz, baseAlpha, treatments, includeAirAbsorption } = parsed.data;
    const modes = computeModes(room, { maxHz });
    return {
      modes,
      analysis: analyzeModes(modes),
      density: modeDensity(modes, 10, maxHz),
      rt60: computeRT60({ room, baseAlpha, treatments, includeAirAbsorption }),
    };
  });
};
