// TypeScript description of the tables, used by Drizzle for typed queries.
// The source of truth for the database itself is supabase/migrations/*.sql;
// keep the two in step when a table changes.
import {
  bigint,
  boolean,
  date,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "accountant", "viewer"] }).notNull(),
  language: text("language", { enum: ["en", "ar"] }).notNull().default("ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  currency: text("currency").notNull().default("EGP"),
  // mode "number": read as a JS number. Safe up to 9 quadrillion piasters.
  openingBalanceMinor: bigint("opening_balance_minor", { mode: "number" }).notNull().default(0),
  openingDate: date("opening_date").notNull(),
  receivesTransfers: boolean("receives_transfers").notNull().default(true),
  issuesCheques: boolean("issues_cheques").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactionTypes = [
  "transfer_in",
  "deposit",
  "internal_in",
  "cheque",
  "fee",
  "internal_out",
] as const;

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  bankAccountId: uuid("bank_account_id").notNull().references(() => bankAccounts.id),
  type: text("type", { enum: transactionTypes }).notNull(),
  amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
  partyName: text("party_name"),
  reference: text("reference"),
  description: text("description"),
  chequeNumber: text("cheque_number"),
  transactionDate: date("transaction_date").notNull(),
  dueDate: date("due_date"),
  status: text("status").notNull(),
  clearedDate: date("cleared_date"),
  transferGroupId: uuid("transfer_group_id"),
  statusReason: text("status_reason"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  updatedBy: uuid("updated_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  action: text("action").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
