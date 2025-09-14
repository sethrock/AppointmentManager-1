import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
// Session table for storing session data
export const sessions = pgTable("session", {
  sid: text("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

// Provider schema - Expanded with HR fields
export const providers = pgTable("providers", {
  id: serial("id").primaryKey(),
  
  // Basic Information
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  name: text("name").notNull(), // Keep for backward compatibility
  
  // Contact Information
  email: text("email").unique(),
  phone: text("phone"),
  
  // Employment Information
  jobTitle: text("job_title"),
  department: text("department"),
  managerId: integer("manager_id").references(() => providers.id),
  employmentType: text("employment_type"), // 'FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN'
  status: text("status").default("ACTIVE"), // 'ACTIVE', 'ON_LEAVE', 'TERMINATED'
  active: boolean("active").default(true), // Keep for backward compatibility
  isArchived: boolean("is_archived").default(false),
  
  // Dates
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  // Additional Information
  officeLocation: text("office_location"),
  tags: text("tags").array().default([]),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider Credentials table
export const providerCredentials = pgTable("provider_credentials", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: 'cascade' }),
  licenseNumber: text("license_number"),
  licenseType: text("license_type"),
  licenseState: text("license_state"),
  licenseExpiresOn: timestamp("license_expires_on"),
  certifications: json("certifications"), // Array of certification objects
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider Compensation table
export const providerCompensation = pgTable("provider_compensation", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: 'cascade' }),
  payType: text("pay_type").notNull(), // 'SALARY', 'HOURLY', 'OTHER'
  rateOrSalary: doublePrecision("rate_or_salary"),
  overtimeEligible: boolean("overtime_eligible").default(false),
  effectiveDate: timestamp("effective_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider Emergency Contacts table
export const providerContacts = pgTable("provider_contacts", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: 'cascade' }),
  emergencyContactName: text("emergency_contact_name").notNull(),
  emergencyContactPhone: text("emergency_contact_phone").notNull(),
  relationship: text("relationship"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider Documents table
export const providerDocuments = pgTable("provider_documents", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => providers.id, { onDelete: 'cascade' }),
  docType: text("doc_type").notNull(), // 'RESUME', 'CONTRACT', 'ID', 'LICENSE', 'CERTIFICATION', 'OTHER'
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Logs table for tracking changes
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  entity: text("entity").notNull(), // 'provider', 'appointment', 'client', etc.
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(), // 'CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'UNARCHIVE'
  diff: json("diff"), // JSON object with before/after values
  metadata: json("metadata"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

// Appointment schema
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  setBy: text("set_by").notNull(),
  provider: text("provider").notNull(),
  marketingChannel: text("marketing_channel").notNull(),
  
  // Client Information
  clientId: integer("client_id").references(() => clients.id),
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
  grossRevenue: doublePrecision("projected_revenue"),
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
  recognizedRevenue: doublePrecision("recognized_revenue").default(0),
  deferredRevenue: doublePrecision("deferred_revenue").default(0),
  realizedRevenue: doublePrecision("realized_revenue").default(0),
  paymentProcessor: text("payment_processor"),
  paymentNotes: text("payment_notes"),
  seeClientAgain: boolean("see_client_again"),
  appointmentNotes: text("appointment_notes"),
  
  // Reschedule fields
  updatedStartDate: text("updated_start_date"),
  updatedStartTime: text("updated_start_time"),
  updatedEndDate: text("updated_end_date"),
  updatedEndTime: text("updated_end_time"),
  rescheduleOccurrences: integer("reschedule_occurrences").default(0),
  
  // Cancel fields
  whoCanceled: text("who_canceled"), // 'client' or 'provider'
  cancellationDetails: text("cancellation_details"),
  depositReturnAmount: doublePrecision("deposit_return_amount").default(0),
  depositReturned: boolean("deposit_returned").default(false),
  
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
  totalCollected: true,
  recognizedRevenue: true,
  deferredRevenue: true,
  realizedRevenue: true
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Clients schema
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  phoneNumber: text("phone_number").unique(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  marketingChannel: text("marketing_channel"),
  acquisitionDate: timestamp("acquisition_date").defaultNow(),
  status: text("status").default("active"), // active, inactive, vip
  tags: text("tags").array().default([]),
  internalNotes: text("internal_notes"),
  communicationPreference: text("communication_preference"), // email, phone, text
  photoUrl: text("photo_url"),
  totalRevenue: doublePrecision("total_revenue").default(0),
  appointmentCount: integer("appointment_count").default(0),
  lastAppointmentDate: timestamp("last_appointment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalRevenue: true,
  appointmentCount: true,
  lastAppointmentDate: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;

// Provider validation schemas
export const insertProviderSchema = createInsertSchema(providers).omit({
  id: true,
  name: true, // name is computed from firstName + lastName
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email().optional().nullable(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'INTERN']).optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().transform(str => str ? new Date(str) : null).optional(),
  endDate: z.string().transform(str => str ? new Date(str) : null).optional(),
});

export const insertProviderCredentialsSchema = createInsertSchema(providerCredentials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderCompensationSchema = createInsertSchema(providerCompensation).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  payType: z.enum(['SALARY', 'HOURLY', 'OTHER']),
  effectiveDate: z.string().transform(str => str ? new Date(str) : new Date()).optional(),
  endDate: z.string().transform(str => str ? new Date(str) : null).optional(),
});

export const insertProviderContactsSchema = createInsertSchema(providerContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProviderDocumentsSchema = createInsertSchema(providerDocuments).omit({
  id: true,
  createdAt: true,
}).extend({
  docType: z.enum(['RESUME', 'CONTRACT', 'ID', 'LICENSE', 'CERTIFICATION', 'OTHER']),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
}).extend({
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'ARCHIVE', 'UNARCHIVE']),
});

// Export types
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = z.infer<typeof insertProviderSchema>;

export type ProviderCredentials = typeof providerCredentials.$inferSelect;
export type InsertProviderCredentials = z.infer<typeof insertProviderCredentialsSchema>;

export type ProviderCompensation = typeof providerCompensation.$inferSelect;
export type InsertProviderCompensation = z.infer<typeof insertProviderCompensationSchema>;

export type ProviderContacts = typeof providerContacts.$inferSelect;
export type InsertProviderContacts = z.infer<typeof insertProviderContactsSchema>;

export type ProviderDocuments = typeof providerDocuments.$inferSelect;
export type InsertProviderDocuments = z.infer<typeof insertProviderDocumentsSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
