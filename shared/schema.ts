import { pgTable, text, serial, varchar, boolean, timestamp, doublePrecision, json, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User schema for authentication (Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

// Provider schema
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").default(true),
});

// Appointment schema
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  setBy: text("set_by").notNull(),
  provider: text("provider").notNull(),
  marketingChannel: text("marketing_channel").notNull(),
  
  // Client Information
  clientName: text("client_name"),
  phoneNumber: text("phone_number"),
  clientUsesEmail: boolean("client_uses_email").default(false),
  clientEmail: text("client_email"),
  
  // Appointment Location
  callType: text("call_type").notNull(), // 'in-call' or 'out-call'
  streetAddress: text("street_address"),
  addressLine2: text("address_line_2"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  outcallDetails: text("outcall_details"),
  
  // Appointment Date/Time
  startDate: text("start_date").notNull(),
  startTime: text("start_time").notNull(),
  endDate: text("end_date"),
  endTime: text("end_time"),
  callDuration: doublePrecision("call_duration"),
  
  // Appointment Financials
  grossRevenue: doublePrecision("gross_revenue"),
  travelExpense: doublePrecision("travel_expense").default(0),
  hostingExpense: doublePrecision("hosting_expense").default(0),
  inOutGoesTo: text("in_out_goes_to"), // 'agency' or 'provider'
  totalExpenses: doublePrecision("total_expenses").default(0),
  depositAmount: doublePrecision("deposit_amount").default(0),
  depositReceivedBy: text("deposit_received_by"),
  paymentProcessUsed: text("payment_process_used"),
  dueToProvider: doublePrecision("due_to_provider").default(0),
  
  // Client Notes
  hasClientNotes: boolean("has_client_notes").default(false),
  clientNotes: text("client_notes"),
  
  // Disposition Status
  dispositionStatus: text("disposition_status"), // 'Complete', 'Reschedule', 'Cancel'
  
  // Complete fields
  totalCollectedCash: doublePrecision("total_collected_cash").default(0),
  totalCollectedDigital: doublePrecision("total_collected_digital").default(0),
  totalCollected: doublePrecision("total_collected").default(0),
  paymentProcessor: text("payment_processor"),
  paymentNotes: text("payment_notes"),
  seeClientAgain: boolean("see_client_again"),
  appointmentNotes: text("appointment_notes"),
  
  // Reschedule fields
  updatedStartDate: text("updated_start_date"),
  updatedStartTime: text("updated_start_time"),
  updatedEndDate: text("updated_end_date"),
  updatedEndTime: text("updated_end_time"),
  
  // Cancel fields
  whoCanceled: text("who_canceled"), // 'client' or 'provider'
  cancellationDetails: text("cancellation_details"),
  
  // Calendar integration
  calendarEventId: text("calendar_event_id"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Create validation schema for new appointment
export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalExpenses: true,
  dueToProvider: true,
  totalCollected: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

export type Provider = typeof providers.$inferSelect;
