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

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Provider operations
  getProviders(): Promise<Provider[]>;
  getProvider(id: number): Promise<Provider | undefined>;
  
  // Appointment operations
  getAppointments(): Promise<Appointment[]>;
  getAppointment(id: number): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number): Promise<boolean>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private providers: Map<number, Provider>;
  private appointments: Map<number, Appointment>;
  
  private currentUserId: number;
  private currentProviderId: number;
  private currentAppointmentId: number;
  
  constructor() {
    this.users = new Map();
    this.providers = new Map();
    this.appointments = new Map();
    
    this.currentUserId = 1;
    this.currentProviderId = 1;
    this.currentAppointmentId = 1;
    
    this.initializeData();
  }
  
  private initializeData() {
    // Add some default providers
    const defaultProviders = [
      { id: this.currentProviderId++, name: 'Sera', active: true },
      { id: this.currentProviderId++, name: 'Courtesan Couple', active: true },
      { id: this.currentProviderId++, name: 'Chloe', active: true },
      { id: this.currentProviderId++, name: 'Alexa', active: true },
      { id: this.currentProviderId++, name: 'Frenchie', active: true }
    ];
    
    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Provider methods
  async getProviders(): Promise<Provider[]> {
    return Array.from(this.providers.values());
  }
  
  async getProvider(id: number): Promise<Provider | undefined> {
    return this.providers.get(id);
  }
  
  // Appointment methods
  async getAppointments(): Promise<Appointment[]> {
    return Array.from(this.appointments.values());
  }
  
  async getAppointment(id: number): Promise<Appointment | undefined> {
    return this.appointments.get(id);
  }
  
  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = this.currentAppointmentId++;
    const now = new Date();
    
    // Calculate derived values
    const totalExpenses = (insertAppointment.travelExpense || 0) + (insertAppointment.hostingExpense || 0);
    const dueToProvider = (insertAppointment.grossRevenue || 0) - (insertAppointment.depositAmount || 0);
    const totalCollected = (insertAppointment.totalCollectedCash || 0) + (insertAppointment.totalCollectedDigital || 0);
    
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      totalExpenses,
      dueToProvider,
      totalCollected,
      createdAt: now,
      updatedAt: now
    };
    
    this.appointments.set(id, appointment);
    return appointment;
  }
  
  async updateAppointment(id: number, updateData: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const appointment = this.appointments.get(id);
    
    if (!appointment) {
      return undefined;
    }
    
    // Calculate derived values
    const travelExpense = updateData.travelExpense !== undefined ? updateData.travelExpense : appointment.travelExpense;
    const hostingExpense = updateData.hostingExpense !== undefined ? updateData.hostingExpense : appointment.hostingExpense;
    const totalExpenses = travelExpense + hostingExpense;
    
    const grossRevenue = updateData.grossRevenue !== undefined ? updateData.grossRevenue : appointment.grossRevenue;
    const depositAmount = updateData.depositAmount !== undefined ? updateData.depositAmount : appointment.depositAmount;
    const dueToProvider = (grossRevenue || 0) - (depositAmount || 0);
    
    const totalCollectedCash = updateData.totalCollectedCash !== undefined ? updateData.totalCollectedCash : appointment.totalCollectedCash;
    const totalCollectedDigital = updateData.totalCollectedDigital !== undefined ? updateData.totalCollectedDigital : appointment.totalCollectedDigital;
    const totalCollected = totalCollectedCash + totalCollectedDigital;
    
    const updated: Appointment = {
      ...appointment,
      ...updateData,
      totalExpenses,
      dueToProvider,
      totalCollected,
      updatedAt: new Date()
    };
    
    this.appointments.set(id, updated);
    return updated;
  }
  
  async deleteAppointment(id: number): Promise<boolean> {
    return this.appointments.delete(id);
  }
}

export const storage = new MemStorage();
