/**
 * Schema completo del gestionale. I moduli segnati "predisposto" nel registro (core/modules.ts)
 * hanno già le tabelle, così potranno essere implementati senza migrazioni strutturali.
 * Convenzioni: UUID, importi in centesimi interi (*_cents), eliminazione logica sui documenti contabili.
 */
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const ts = (name: string) => timestamp(name, { withTimezone: true });
const stamps = {
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
};

/* ---------------------------------- Utenti e ruoli ---------------------------------- */

export const userRole = pgEnum("user_role", ["owner", "engineer", "admin"]);

export const appUser = pgTable("app_user", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("engineer"),
  passwordHash: text("password_hash"),
  ...stamps,
});

/* ------------------------------------ CRM e progetti ------------------------------------ */

export const clientType = pgEnum("client_type", ["person", "company"]);

export const client = pgTable("client", {
  id: id(),
  type: clientType("type").notNull().default("person"),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  taxCode: text("tax_code"),
  pec: text("pec"),
  sdiCode: text("sdi_code"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  deletedAt: ts("deleted_at"),
  ...stamps,
});

export const projectStatus = pgEnum("project_status", ["quote", "in_progress", "delivered", "closed"]);

export const project = pgTable("project", {
  id: id(),
  clientId: uuid("client_id").notNull().references(() => client.id),
  title: text("title").notNull(),
  status: projectStatus("status").notNull().default("quote"),
  budgetCents: integer("budget_cents"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  ...stamps,
});

/* ------------------------------------------ Booking ------------------------------------------ */

export const sessionType = pgEnum("session_type", ["recording", "mixing", "mastering", "rehearsal", "other"]);
export const sessionStatus = pgEnum("session_status", ["tentative", "confirmed", "done", "cancelled"]);
export const roomKind = pgEnum("room_kind", ["control_room", "live_room", "booth", "other"]);

/** Sale prenotabili. Semplice per ora (nome, tipo, colore); estendibile con attrezzatura per sala. */
export const roomResource = pgTable("room_resource", {
  id: id(),
  name: text("name").notNull(),
  kind: roomKind("kind").notNull().default("control_room"),
  color: text("color").notNull().default("#4f8cff"),
  active: boolean("active").notNull().default(true),
  ...stamps,
});

export const staff = pgTable("staff", {
  id: id(),
  userId: uuid("user_id").references(() => appUser.id),
  name: text("name").notNull(),
  roleLabel: text("role_label").notNull().default("Fonico"),
  color: text("color").notNull().default("#ff8c4f"),
  active: boolean("active").notNull().default(true),
  ...stamps,
});

export const session = pgTable("session", {
  id: id(),
  projectId: uuid("project_id").references(() => project.id),
  clientId: uuid("client_id").references(() => client.id),
  type: sessionType("type").notNull().default("recording"),
  status: sessionStatus("status").notNull().default("confirmed"),
  title: text("title"),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  notes: text("notes"),
  ...stamps,
});

/**
 * Prenotazione di una sala. Il vincolo anti-sovrapposizione è nella migrazione manuale
 * (EXCLUDE USING gist su room_id + tstzrange(start_at, end_at) WHERE active).
 * start_at/end_at sono copiati dalla sessione (comprendono il buffer di setup).
 */
export const sessionRoom = pgTable("session_room", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").notNull().references(() => roomResource.id),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  active: boolean("active").notNull().default(true),
});

export const sessionStaff = pgTable("session_staff", {
  id: id(),
  sessionId: uuid("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
  staffId: uuid("staff_id").notNull().references(() => staff.id),
  startAt: ts("start_at").notNull(),
  endAt: ts("end_at").notNull(),
  active: boolean("active").notNull().default(true),
});

/* --------------------------------------------- Finanza --------------------------------------------- */

export const flowKind = pgEnum("flow_kind", ["income", "expense"]);
export const quotationStatus = pgEnum("quotation_status", ["draft", "sent", "accepted", "rejected", "expired"]);
export const invoiceStatus = pgEnum("invoice_status", ["draft", "issued", "partial", "paid"]);

export const category = pgTable("category", {
  id: id(),
  name: text("name").notNull(),
  kind: flowKind("kind").notNull(),
  color: text("color").notNull().default("#7a8aa0"),
});

export const supplier = pgTable("supplier", {
  id: id(),
  name: text("name").notNull(),
  vatNumber: text("vat_number"),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
  ...stamps,
});

export const quotation = pgTable(
  "quotation",
  {
    id: id(),
    year: integer("year").notNull(),
    number: integer("number").notNull(),
    clientId: uuid("client_id").notNull().references(() => client.id),
    projectId: uuid("project_id").references(() => project.id),
    status: quotationStatus("status").notNull().default("draft"),
    validUntil: date("valid_until"),
    notes: text("notes"),
    totalNetCents: integer("total_net_cents").notNull().default(0),
    totalVatCents: integer("total_vat_cents").notNull().default(0),
    convertedInvoiceId: uuid("converted_invoice_id"),
    deletedAt: ts("deleted_at"),
    ...stamps,
  },
  (t) => [unique("quotation_year_number").on(t.year, t.number)],
);

export const quotationLine = pgTable("quotation_line", {
  id: id(),
  quotationId: uuid("quotation_id").notNull().references(() => quotation.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  vatRatePct: numeric("vat_rate_pct", { precision: 5, scale: 2 }).notNull().default("22"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
});

export const invoice = pgTable(
  "invoice",
  {
    id: id(),
    year: integer("year").notNull(),
    number: integer("number").notNull(),
    clientId: uuid("client_id").notNull().references(() => client.id),
    projectId: uuid("project_id").references(() => project.id),
    quotationId: uuid("quotation_id").references(() => quotation.id),
    status: invoiceStatus("status").notNull().default("draft"),
    issueDate: date("issue_date"),
    dueDate: date("due_date"),
    notes: text("notes"),
    totalNetCents: integer("total_net_cents").notNull().default(0),
    totalVatCents: integer("total_vat_cents").notNull().default(0),
    deletedAt: ts("deleted_at"),
    ...stamps,
  },
  (t) => [unique("invoice_year_number").on(t.year, t.number)],
);

export const invoiceLine = pgTable("invoice_line", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoice.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPriceCents: integer("unit_price_cents").notNull(),
  vatRatePct: numeric("vat_rate_pct", { precision: 5, scale: 2 }).notNull().default("22"),
  discountPct: numeric("discount_pct", { precision: 5, scale: 2 }).notNull().default("0"),
});

export const payment = pgTable("payment", {
  id: id(),
  invoiceId: uuid("invoice_id").notNull().references(() => invoice.id),
  paidOn: date("paid_on").notNull(),
  amountCents: integer("amount_cents").notNull(),
  method: text("method"),
  ...stamps,
});

/* -------------------------------- Magazzino, cablaggio, noleggi, DDT -------------------------------- */

export const equipmentStatus = pgEnum("equipment_status", ["available", "rented", "maintenance", "retired"]);
export const cableStatus = pgEnum("cable_status", ["ok", "to_repair", "retired"]);
export const rentalStatus = pgEnum("rental_status", ["reserved", "out", "returned", "cancelled"]);

export const equipmentType = pgTable("equipment_type", {
  id: id(),
  name: text("name").notNull().unique(),
});

export const equipment = pgTable(
  "equipment",
  {
    id: id(),
    name: text("name").notNull(),
    manufacturer: text("manufacturer"),
    serialNumber: text("serial_number"),
    purchasePriceCents: integer("purchase_price_cents"),
    purchasedOn: date("purchased_on"),
    supplierId: uuid("supplier_id").references(() => supplier.id),
    typeId: uuid("type_id").references(() => equipmentType.id),
    status: equipmentStatus("status").notNull().default("available"),
    location: text("location"),
    notes: text("notes"),
    deletedAt: ts("deleted_at"),
    ...stamps,
  },
  (t) => [unique("equipment_manufacturer_serial").on(t.manufacturer, t.serialNumber)],
);

export const transaction = pgTable("transaction", {
  id: id(),
  occurredOn: date("occurred_on").notNull(),
  kind: flowKind("kind").notNull(),
  amountCents: integer("amount_cents").notNull(),
  vatRatePct: numeric("vat_rate_pct", { precision: 5, scale: 2 }),
  categoryId: uuid("category_id").references(() => category.id),
  supplierId: uuid("supplier_id").references(() => supplier.id),
  projectId: uuid("project_id").references(() => project.id),
  invoiceId: uuid("invoice_id").references(() => invoice.id),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
  attachmentUrl: text("attachment_url"),
  note: text("note"),
  deletedAt: ts("deleted_at"),
  ...stamps,
});

export const cable = pgTable("cable", {
  id: id(),
  label: text("label").notNull().unique(),
  kind: text("kind").notNull(),
  lengthM: numeric("length_m", { precision: 6, scale: 2 }),
  connectorA: text("connector_a"),
  connectorB: text("connector_b"),
  status: cableStatus("status").notNull().default("ok"),
  notes: text("notes"),
  ...stamps,
});

export const patchbay = pgTable("patchbay", {
  id: id(),
  name: text("name").notNull(),
  rows: integer("rows").notNull().default(1),
  pointsPerRow: integer("points_per_row").notNull().default(24),
});

export const patchbayPoint = pgTable(
  "patchbay_point",
  {
    id: id(),
    patchbayId: uuid("patchbay_id").notNull().references(() => patchbay.id, { onDelete: "cascade" }),
    row: integer("row").notNull(),
    position: integer("position").notNull(),
    side: text("side").notNull(), // "top" | "bottom"
    label: text("label"),
    normalling: text("normalling"), // full | half | parallel | open
    equipmentId: uuid("equipment_id").references(() => equipment.id),
    port: text("port"),
  },
  (t) => [unique("patchbay_point_pos").on(t.patchbayId, t.row, t.position, t.side)],
);

/** Collegamento tra due endpoint (punto patchbay o porta di apparecchio), con cavo opzionale. */
export const connection = pgTable("connection", {
  id: id(),
  endpointAKind: text("endpoint_a_kind").notNull(), // "patchbay_point" | "equipment_port"
  endpointAId: uuid("endpoint_a_id").notNull(),
  endpointAPort: text("endpoint_a_port"),
  endpointBKind: text("endpoint_b_kind").notNull(),
  endpointBId: uuid("endpoint_b_id").notNull(),
  endpointBPort: text("endpoint_b_port"),
  cableId: uuid("cable_id").references(() => cable.id),
  notes: text("notes"),
  ...stamps,
});

export const rental = pgTable("rental", {
  id: id(),
  clientId: uuid("client_id").notNull().references(() => client.id),
  outAt: date("out_at").notNull(),
  expectedReturnAt: date("expected_return_at").notNull(),
  returnedAt: date("returned_at"),
  depositCents: integer("deposit_cents"),
  status: rentalStatus("status").notNull().default("reserved"),
  notes: text("notes"),
  ...stamps,
});

export const rentalItem = pgTable(
  "rental_item",
  {
    rentalId: uuid("rental_id").notNull().references(() => rental.id, { onDelete: "cascade" }),
    equipmentId: uuid("equipment_id").notNull().references(() => equipment.id),
    dailyRateCents: integer("daily_rate_cents"),
  },
  (t) => [primaryKey({ columns: [t.rentalId, t.equipmentId] })],
);

export const ddt = pgTable(
  "ddt",
  {
    id: id(),
    year: integer("year").notNull(),
    number: integer("number").notNull(),
    issuedOn: date("issued_on").notNull(),
    clientId: uuid("client_id").notNull().references(() => client.id),
    rentalId: uuid("rental_id").references(() => rental.id),
    reason: text("reason").notNull(), // causale del trasporto
    transportBy: text("transport_by"), // mittente | destinatario | vettore
    carrier: text("carrier"),
    packages: integer("packages"),
    weightKg: numeric("weight_kg", { precision: 8, scale: 2 }),
    notes: text("notes"),
    ...stamps,
  },
  (t) => [unique("ddt_year_number").on(t.year, t.number)],
);

export const ddtLine = pgTable("ddt_line", {
  id: id(),
  ddtId: uuid("ddt_id").notNull().references(() => ddt.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
});

/* ------------------------------------------ Acustica ------------------------------------------ */

export const surfaceKindEnum = pgEnum("surface_kind", [
  "floor",
  "ceiling",
  "wall_north",
  "wall_south",
  "wall_east",
  "wall_west",
]);

/** Stanza acustica. `resourceId` la collega alla sala prenotabile (opzionale). */
export const room = pgTable("room", {
  id: id(),
  resourceId: uuid("resource_id").references(() => roomResource.id),
  name: text("name").notNull(),
  lengthM: numeric("length_m", { precision: 6, scale: 3 }).notNull(),
  widthM: numeric("width_m", { precision: 6, scale: 3 }).notNull(),
  heightM: numeric("height_m", { precision: 6, scale: 3 }).notNull(),
  temperatureC: numeric("temperature_c", { precision: 4, scale: 1 }).notNull().default("20"),
  humidityPct: numeric("humidity_pct", { precision: 4, scale: 1 }),
  ...stamps,
});

export const material = pgTable("material", {
  id: id(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer"),
  category: text("category").notNull(),
  thicknessMm: integer("thickness_mm"),
  source: text("source"),
  isVerified: boolean("is_verified").notNull().default(false),
  isCustom: boolean("is_custom").notNull().default(false),
  ...stamps,
});

export const materialCoefficient = pgTable(
  "material_coefficient",
  {
    materialId: uuid("material_id").notNull().references(() => material.id, { onDelete: "cascade" }),
    bandHz: integer("band_hz").notNull(),
    alpha: numeric("alpha", { precision: 4, scale: 3 }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.materialId, t.bandHz] })],
);

export const surface = pgTable(
  "surface",
  {
    id: id(),
    roomId: uuid("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
    kind: surfaceKindEnum("kind").notNull(),
    baseMaterialId: uuid("base_material_id").references(() => material.id),
  },
  (t) => [unique("surface_room_kind").on(t.roomId, t.kind)],
);

export const treatmentOrigin = pgEnum("treatment_origin", ["calculator", "floorplan"]);

/** Fonte di verità dei trattamenti: la planimetria li rappresenta con floorplan_item.treatment_id. */
export const surfaceTreatment = pgTable("surface_treatment", {
  id: id(),
  roomId: uuid("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  surfaceId: uuid("surface_id").references(() => surface.id, { onDelete: "set null" }),
  materialId: uuid("material_id").notNull().references(() => material.id),
  areaM2: numeric("area_m2", { precision: 8, scale: 3 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  origin: treatmentOrigin("origin").notNull().default("calculator"),
  label: text("label"),
  ...stamps,
});

export const rt60Snapshot = pgTable("rt60_snapshot", {
  id: id(),
  roomId: uuid("room_id").notNull().references(() => room.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  params: jsonb("params").notNull(),
  results: jsonb("results").notNull(),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/* ---------------------------------- Planimetria e stage plot ---------------------------------- */

export const catalogItem = pgTable("catalog_item", {
  id: id(),
  category: text("category").notNull(), // furniture | rack | monitor | speaker | panel | instrument
  name: text("name").notNull(),
  widthMm: integer("width_mm").notNull(),
  depthMm: integer("depth_mm").notNull(),
  heightMm: integer("height_mm"),
  defaultMount: text("default_mount").notNull().default("floor"), // floor | wall | ceiling | corner
  symbolSvg: text("symbol_svg"),
  materialId: uuid("material_id").references(() => material.id),
  effectiveAreaM2: numeric("effective_area_m2", { precision: 8, scale: 3 }),
});

export const floorplan = pgTable("floorplan", {
  id: id(),
  roomId: uuid("room_id").notNull().references(() => room.id, { onDelete: "cascade" }).unique(),
  widthMm: integer("width_mm").notNull(),
  depthMm: integer("depth_mm").notNull(),
  gridMm: integer("grid_mm").notNull().default(100),
  ...stamps,
});

export const floorplanItem = pgTable("floorplan_item", {
  id: id(),
  floorplanId: uuid("floorplan_id").notNull().references(() => floorplan.id, { onDelete: "cascade" }),
  catalogItemId: uuid("catalog_item_id").references(() => catalogItem.id),
  xMm: integer("x_mm").notNull(),
  yMm: integer("y_mm").notNull(),
  rotationDeg: numeric("rotation_deg", { precision: 6, scale: 2 }).notNull().default("0"),
  widthMm: integer("width_mm").notNull(),
  depthMm: integer("depth_mm").notNull(),
  heightMm: integer("height_mm"),
  mount: text("mount").notNull().default("floor"),
  layer: text("layer").notNull().default("items"),
  zOrder: integer("z_order").notNull().default(0),
  props: jsonb("props"),
  treatmentId: uuid("treatment_id").references(() => surfaceTreatment.id, { onDelete: "set null" }),
  equipmentId: uuid("equipment_id").references(() => equipment.id),
});

export const stagePlot = pgTable("stage_plot", {
  id: id(),
  projectId: uuid("project_id").references(() => project.id),
  title: text("title").notNull(),
  venue: text("venue"),
  widthM: numeric("width_m", { precision: 5, scale: 2 }).notNull().default("6"),
  depthM: numeric("depth_m", { precision: 5, scale: 2 }).notNull().default("4"),
  ...stamps,
});

export const stagePlotItem = pgTable("stage_plot_item", {
  id: id(),
  stagePlotId: uuid("stage_plot_id").notNull().references(() => stagePlot.id, { onDelete: "cascade" }),
  elementType: text("element_type").notNull(),
  label: text("label"),
  xM: numeric("x_m", { precision: 6, scale: 3 }).notNull(),
  yM: numeric("y_m", { precision: 6, scale: 3 }).notNull(),
  rotationDeg: numeric("rotation_deg", { precision: 6, scale: 2 }).notNull().default("0"),
  channelNo: integer("channel_no"),
  micModel: text("mic_model"),
  phantom: boolean("phantom").notNull().default(false),
  notes: text("notes"),
});
