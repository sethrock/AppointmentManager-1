import { 
  appointments, 
  type Appointment, 
  type InsertAppointment,
  users, 
  type User, 
  type InsertUser,
  providers,
  type Provider,
  clients,
  type Client,
  type InsertClient
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { updateAppointmentRevenue } from "./services/revenueService.js";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Provider operations
  getProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  createProvider(name: string, active?: boolean): Promise<Provider>;
  
  // Appointment operations
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  updateCalendarEventId(id: number, calendarEventId: string): Promise<Appointment | undefined>;
  confirmDepositReturn(id: number): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
  
  // Client operations
  getClients(filters?: {
    search?: string;
    status?: string;
    marketingChannel?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ clients: Client[]; total: number }>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientByPhone(phone: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;
  getClientAppointments(clientId: number): Promise<Appointment[]>;
  updateClientMetrics(clientId: number): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }
  
  // Provider methods
  async getProviders(): Promise<Provider[]> {
    return await db.select().from(providers);
  }
  
  async getProvider(id: number): Promise<Provider | undefined> {
    const result = await db.select().from(providers).where(eq(providers.id, id));
    return result[0];
  }
  
  async createProvider(name: string, active: boolean = true): Promise<Provider> {
    const result = await db.insert(providers).values({ name, active }).returning();
    return result[0];
  }
  
  // Appointment methods
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments);
  }
  
  async getAppointment(id: number): Promise<Appointment | undefined> {
    const result = await db.select().from(appointments).where(eq(appointments.id, id));
    return result[0];
  }
  
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    // Calculate derived values
    const totalExpenses = (insertAppointment.travelExpense || 0) + (insertAppointment.hostingExpense || 0);
    const dueToProvider = (insertAppointment.grossRevenue || 0) - (insertAppointment.depositAmount || 0);
    const totalCollected = (insertAppointment.totalCollectedCash || 0) + (insertAppointment.totalCollectedDigital || 0) + (insertAppointment.depositAmount || 0);
    const realizedRevenue = (insertAppointment.depositAmount || 0) + totalCollected;
    
    // Create appointment object for revenue calculation
    const newAppointment: Appointment = {
      ...insertAppointment,
      id: 0, // Temporary ID for calculation
      totalCollected,
      totalExpenses,
      dueToProvider,
      recognizedRevenue: 0,
      deferredRevenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Appointment;
    
    // Calculate revenue based on business logic
    const revenueUpdate = updateAppointmentRevenue(newAppointment);
    
    const now = new Date();
    
    const result = await db.insert(appointments).values({
      ...insertAppointment,
      totalExpenses,
      dueToProvider,
      totalCollected,
      realizedRevenue,
      recognizedRevenue: revenueUpdate.recognizedRevenue,
      deferredRevenue: revenueUpdate.deferredRevenue,
      createdAt: now,
      updatedAt: now
    }).returning();
    
    return result[0];
  }
  
  /**
   * Update the calendar event ID for an appointment
   */
  async updateCalendarEventId(id: number, calendarEventId: string): Promise<Appointment | undefined> {
    const result = await db.update(appointments)
      .set({
        calendarEventId,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, id))
      .returning();
    
    return result[0];
  }

  async confirmDepositReturn(id: number): Promise<Appointment | undefined> {
    const result = await db.update(appointments)
      .set({
        depositReturned: true,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, id))
      .returning();
    
    return result[0];
  }
  
  async updateAppointment(id: number, updateData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    // Get the current appointment
    const currentAppointment = await this.getAppointment(id);
    
    if (!currentAppointment) {
      return undefined;
    }
    
    // Calculate derived values
    const travelExpense = updateData.travelExpense !== undefined ? updateData.travelExpense : currentAppointment.travelExpense;
    const hostingExpense = updateData.hostingExpense !== undefined ? updateData.hostingExpense : currentAppointment.hostingExpense;
    const totalExpenses = (travelExpense || 0) + (hostingExpense || 0);
    
    const grossRevenue = updateData.grossRevenue !== undefined ? updateData.grossRevenue : currentAppointment.grossRevenue;
    const depositAmount = updateData.depositAmount !== undefined ? updateData.depositAmount : currentAppointment.depositAmount;
    const dueToProvider = (grossRevenue || 0) - (depositAmount || 0);
    
    const totalCollectedCash = updateData.totalCollectedCash !== undefined ? updateData.totalCollectedCash : currentAppointment.totalCollectedCash;
    const totalCollectedDigital = updateData.totalCollectedDigital !== undefined ? updateData.totalCollectedDigital : currentAppointment.totalCollectedDigital;
    const totalCollected = (totalCollectedCash || 0) + (totalCollectedDigital || 0);
    
    // Handle reschedule occurrences
    let rescheduleOccurrences = currentAppointment.rescheduleOccurrences || 0;
    
    // Increment if status changes to "Reschedule" for the first time
    if (updateData.dispositionStatus === 'Reschedule' && currentAppointment.dispositionStatus !== 'Reschedule') {
      rescheduleOccurrences += 1;
    }
    // Also increment if already in "Reschedule" status and dates/times are being updated
    else if (currentAppointment.dispositionStatus === 'Reschedule' && 
             (updateData.updatedStartDate || updateData.updatedStartTime || 
              updateData.updatedEndDate || updateData.updatedEndTime)) {
      rescheduleOccurrences += 1;
    }
    
    // Create updated appointment object for revenue calculation
    const updatedAppointment: Appointment = {
      ...currentAppointment,
      ...updateData,
      totalExpenses,
      dueToProvider,
      totalCollected,
      depositAmount,
    };
    
    // Calculate revenue based on business logic
    const revenueUpdate = updateAppointmentRevenue(updatedAppointment);
    
    const result = await db.update(appointments)
      .set({
        ...updateData,
        totalExpenses,
        dueToProvider,
        totalCollected,
        recognizedRevenue: revenueUpdate.recognizedRevenue,
        deferredRevenue: revenueUpdate.deferredRevenue,
        realizedRevenue: revenueUpdate.realizedRevenue,
        rescheduleOccurrences,
        updatedAt: new Date()
      })
      .where(eq(appointments.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteAppointment(id: number): Promise<boolean> {
    const result = await db.delete(appointments).where(eq(appointments.id, id)).returning();
    return result.length > 0;
  }
  
  // Client methods
  async getClients(filters?: {
    search?: string;
    status?: string;
    marketingChannel?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ clients: Client[]; total: number }> {
    const { or, and, like, sql } = await import("drizzle-orm");
    
    let conditions: any[] = [];
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(clients.name, searchTerm),
          like(clients.email, searchTerm),
          like(clients.phoneNumber, searchTerm),
          like(clients.internalNotes, searchTerm)
        )
      );
    }
    
    if (filters?.status) {
      conditions.push(eq(clients.status, filters.status));
    }
    
    if (filters?.marketingChannel) {
      conditions.push(eq(clients.marketingChannel, filters.marketingChannel));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clients)
      .where(whereClause);
    
    const total = countResult[0]?.count || 0;
    
    // Get paginated results
    let query = db.select().from(clients).where(whereClause);
    
    if (filters?.limit && filters?.offset !== undefined) {
      query = query.limit(filters.limit).offset(filters.offset);
    } else if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    const clientsList = await query;
    
    return { clients: clientsList, total };
  }
  
  async getClient(id: number): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }
  
  async getClientByEmail(email: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.email, email));
    return result[0];
  }
  
  async getClientByPhone(phone: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.phoneNumber, phone));
    return result[0];
  }
  
  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }
  
  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db
      .update(clients)
      .set({
        ...client,
        updatedAt: new Date()
      })
      .where(eq(clients.id, id))
      .returning();
    
    return result[0];
  }
  
  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }
  
  async getClientAppointments(clientId: number): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.clientId, clientId));
  }
  
  async updateClientMetrics(clientId: number): Promise<void> {
    const clientAppointments = await this.getClientAppointments(clientId);
    
    // Calculate total revenue and appointment count
    let totalRevenue = 0;
    let appointmentCount = 0;
    let lastAppointmentDate: Date | null = null;
    
    for (const appointment of clientAppointments) {
      if (appointment.dispositionStatus === 'Complete') {
        totalRevenue += appointment.recognizedRevenue || 0;
      }
      appointmentCount++;
      
      if (appointment.createdAt) {
        if (!lastAppointmentDate || appointment.createdAt > lastAppointmentDate) {
          lastAppointmentDate = appointment.createdAt;
        }
      }
    }
    
    await db
      .update(clients)
      .set({
        totalRevenue,
        appointmentCount,
        lastAppointmentDate,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }
  
  // Initialize default data if needed
  async initializeDefaultProviders(): Promise<void> {
    const existingProviders = await this.getProviders();
    
    if (existingProviders.length === 0) {
      const defaultProviders = [
        { name: 'Sera', active: true },
        { name: 'Courtesan Couple', active: true },
        { name: 'Chloe', active: true },
        { name: 'Alexa', active: true },
        { name: 'Frenchie', active: true }
      ];
      
      for (const provider of defaultProviders) {
        await this.createProvider(provider.name, provider.active);
      }
    }
  }
}

export const storage = new DatabaseStorage();
