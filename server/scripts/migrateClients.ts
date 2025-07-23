import { db } from "../db";
import { appointments, clients } from "@shared/schema";
import { eq, sql, isNotNull, or } from "drizzle-orm";

async function migrateClientsFromAppointments() {
  console.log("Starting client migration...");
  
  try {
    // Get all appointments with client information
    const allAppointments = await db
      .select()
      .from(appointments)
      .where(or(
        isNotNull(appointments.clientName),
        isNotNull(appointments.phoneNumber),
        isNotNull(appointments.clientEmail)
      ));
    
    console.log(`Found ${allAppointments.length} appointments with client data`);
    
    // Group appointments by unique client (phone or email)
    const clientMap = new Map<string, typeof allAppointments>();
    
    for (const appointment of allAppointments) {
      // Create a unique key based on phone or email
      const keys: string[] = [];
      
      if (appointment.phoneNumber) {
        keys.push(`phone:${appointment.phoneNumber}`);
      }
      if (appointment.clientEmail) {
        keys.push(`email:${appointment.clientEmail.toLowerCase()}`);
      }
      if (!appointment.phoneNumber && !appointment.clientEmail && appointment.clientName) {
        // For clients with only name, use name as key
        keys.push(`name:${appointment.clientName.toLowerCase()}`);
      }
      
      // Add appointment to all matching keys
      for (const key of keys) {
        if (!clientMap.has(key)) {
          clientMap.set(key, []);
        }
        clientMap.get(key)!.push(appointment);
      }
    }
    
    // Merge clients that share phone/email
    const mergedClients = new Map<string, typeof allAppointments>();
    const processedKeys = new Set<string>();
    
    for (const [key, appointmentsList] of clientMap.entries()) {
      if (processedKeys.has(key)) continue;
      
      const relatedKeys = new Set<string>([key]);
      const allRelatedAppointments = [...appointmentsList];
      
      // Find all related keys (transitive closure)
      let changed = true;
      while (changed) {
        changed = false;
        for (const apt of allRelatedAppointments) {
          if (apt.phoneNumber) {
            const phoneKey = `phone:${apt.phoneNumber}`;
            if (!relatedKeys.has(phoneKey) && clientMap.has(phoneKey)) {
              relatedKeys.add(phoneKey);
              allRelatedAppointments.push(...clientMap.get(phoneKey)!);
              changed = true;
            }
          }
          if (apt.clientEmail) {
            const emailKey = `email:${apt.clientEmail.toLowerCase()}`;
            if (!relatedKeys.has(emailKey) && clientMap.has(emailKey)) {
              relatedKeys.add(emailKey);
              allRelatedAppointments.push(...clientMap.get(emailKey)!);
              changed = true;
            }
          }
        }
      }
      
      // Mark all related keys as processed
      relatedKeys.forEach(k => processedKeys.add(k));
      
      // Remove duplicates
      const uniqueAppointmentIds = new Set<number>();
      const uniqueAppointments = allRelatedAppointments.filter(apt => {
        if (uniqueAppointmentIds.has(apt.id)) return false;
        uniqueAppointmentIds.add(apt.id);
        return true;
      });
      
      // Use the first key as the client identifier
      mergedClients.set(key, uniqueAppointments);
    }
    
    console.log(`Identified ${mergedClients.size} unique clients`);
    
    let migratedCount = 0;
    
    // Create client records
    for (const [key, clientAppointments] of mergedClients.entries()) {
      // Find the most complete client information
      let clientName = "";
      let clientEmail: string | null = null;
      let clientPhone: string | null = null;
      let marketingChannel: string | null = null;
      let streetAddress: string | null = null;
      let city: string | null = null;
      let state: string | null = null;
      let zipCode: string | null = null;
      let hasNotes = false;
      let clientNotes: string[] = [];
      
      for (const apt of clientAppointments) {
        if (apt.clientName && apt.clientName.length > clientName.length) {
          clientName = apt.clientName;
        }
        if (apt.clientEmail) clientEmail = apt.clientEmail;
        if (apt.phoneNumber) clientPhone = apt.phoneNumber;
        if (apt.marketingChannel) marketingChannel = apt.marketingChannel;
        if (apt.streetAddress) streetAddress = apt.streetAddress;
        if (apt.city) city = apt.city;
        if (apt.state) state = apt.state;
        if (apt.zipCode) zipCode = apt.zipCode;
        if (apt.hasClientNotes && apt.clientNotes) {
          hasNotes = true;
          clientNotes.push(apt.clientNotes);
        }
      }
      
      // Calculate metrics
      const appointmentCount = clientAppointments.length;
      const totalRevenue = clientAppointments.reduce((sum, apt) => {
        // Use recognized revenue if completed, otherwise use projected revenue
        if (apt.dispositionStatus === 'Complete' && apt.recognizedRevenue) {
          return sum + apt.recognizedRevenue;
        } else if (apt.grossRevenue) {
          return sum + apt.grossRevenue;
        }
        return sum;
      }, 0);
      
      // Find last appointment date
      const lastAppointmentDate = clientAppointments
        .map(apt => new Date(apt.updatedStartDate || apt.startDate))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      
      // Determine client status based on activity
      const daysSinceLastAppointment = (Date.now() - lastAppointmentDate.getTime()) / (1000 * 60 * 60 * 24);
      let status = 'active';
      if (daysSinceLastAppointment > 180) {
        status = 'inactive';
      } else if (totalRevenue > 5000 || appointmentCount > 10) {
        status = 'vip';
      }
      
      try {
        // Check if client already exists
        let existingClient = null;
        if (clientEmail) {
          const results = await db.select().from(clients).where(eq(clients.email, clientEmail));
          existingClient = results[0];
        }
        if (!existingClient && clientPhone) {
          const results = await db.select().from(clients).where(eq(clients.phoneNumber, clientPhone));
          existingClient = results[0];
        }
        
        let clientId: number;
        
        if (existingClient) {
          // Update existing client
          const [updated] = await db
            .update(clients)
            .set({
              name: clientName || existingClient.name,
              phoneNumber: clientPhone || existingClient.phoneNumber,
              email: clientEmail || existingClient.email,
              address: streetAddress || existingClient.address,
              city: city || existingClient.city,
              state: state || existingClient.state,
              zipCode: zipCode || existingClient.zipCode,
              marketingChannel: marketingChannel || existingClient.marketingChannel,
              status: status,
              totalRevenue: totalRevenue,
              appointmentCount: appointmentCount,
              lastAppointmentDate: lastAppointmentDate,
              internalNotes: hasNotes ? [...clientNotes, existingClient.internalNotes || ""].filter(Boolean).join("\n---\n") : existingClient.internalNotes,
              updatedAt: new Date()
            })
            .where(eq(clients.id, existingClient.id))
            .returning();
          
          clientId = updated.id;
          console.log(`Updated existing client: ${clientName} (ID: ${clientId})`);
        } else {
          // Create new client
          const [newClient] = await db
            .insert(clients)
            .values({
              name: clientName || "Unknown Client",
              phoneNumber: clientPhone,
              email: clientEmail,
              address: streetAddress,
              city: city,
              state: state,
              zipCode: zipCode,
              marketingChannel: marketingChannel,
              status: status,
              totalRevenue: totalRevenue,
              appointmentCount: appointmentCount,
              lastAppointmentDate: lastAppointmentDate,
              internalNotes: hasNotes ? clientNotes.join("\n---\n") : null,
              tags: [],
              communicationPreference: clientEmail ? 'email' : 'phone'
            })
            .returning();
          
          clientId = newClient.id;
          console.log(`Created new client: ${clientName} (ID: ${clientId})`);
        }
        
        // Update all related appointments with the client ID
        const appointmentIds = clientAppointments.map(apt => apt.id);
        for (const appointmentId of appointmentIds) {
          await db
            .update(appointments)
            .set({ clientId: clientId })
            .where(eq(appointments.id, appointmentId));
        }
        
        migratedCount++;
        
      } catch (error) {
        console.error(`Error migrating client ${clientName}:`, error);
      }
    }
    
    console.log(`\nMigration completed successfully!`);
    console.log(`Migrated ${migratedCount} unique clients`);
    
    // Show summary statistics
    const clientStats = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where status = 'active')::int`,
        inactive: sql<number>`count(*) filter (where status = 'inactive')::int`,
        vip: sql<number>`count(*) filter (where status = 'vip')::int`,
        totalRevenue: sql<number>`sum(total_revenue)`
      })
      .from(clients);
    
    console.log("\nClient Statistics:");
    console.log(`Total Clients: ${clientStats[0].total}`);
    console.log(`Active: ${clientStats[0].active}`);
    console.log(`Inactive: ${clientStats[0].inactive}`);
    console.log(`VIP: ${clientStats[0].vip}`);
    console.log(`Total Revenue: $${clientStats[0].totalRevenue?.toFixed(2) || '0.00'}`);
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateClientsFromAppointments()
  .then(() => {
    console.log("\nMigration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });