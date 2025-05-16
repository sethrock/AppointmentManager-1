import { 
  appointments, 
  type Appointment, 
  type InsertAppointment,
  users, 
  type User, 
  type InsertUser,
  providers,
  type Provider
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
  deleteAppointment(id: number): Promise<boolean>;
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
    
    const now = new Date();
    
    const result = await db.insert(appointments).values({
      ...insertAppointment,
      totalExpenses,
      dueToProvider,
      totalCollected,
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
    const totalCollected = (totalCollectedCash || 0) + (totalCollectedDigital || 0) + (depositAmount || 0);
    
    const result = await db.update(appointments)
      .set({
        ...updateData,
        totalExpenses,
        dueToProvider,
        totalCollected,
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
