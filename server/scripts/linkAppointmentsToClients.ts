import { db } from "../db";
import { appointments, clients } from "@shared/schema";
import { eq, or, and, isNull, isNotNull, count } from "drizzle-orm";

async function linkAppointmentsToClients() {
  console.log("Starting appointment linking process...");
  
  try {
    // Get all clients
    const allClients = await db.select().from(clients);
    console.log(`Found ${allClients.length} clients`);
    
    let linkedCount = 0;
    
    for (const client of allClients) {
      // Find all appointments that match this client
      const conditions = [];
      
      if (client.phoneNumber) {
        conditions.push(eq(appointments.phoneNumber, client.phoneNumber));
      }
      if (client.email) {
        conditions.push(eq(appointments.clientEmail, client.email));
      }
      
      if (conditions.length === 0) {
        // Try to match by name if no phone/email
        if (client.name && client.name !== "Unknown Client") {
          conditions.push(eq(appointments.clientName, client.name));
        }
      }
      
      if (conditions.length > 0) {
        // Update appointments that don't already have a client ID
        const result = await db
          .update(appointments)
          .set({ clientId: client.id })
          .where(and(
            or(...conditions),
            isNull(appointments.clientId)
          ))
          .returning();
        
        if (result.length > 0) {
          linkedCount += result.length;
          console.log(`Linked ${result.length} appointments to client: ${client.name} (ID: ${client.id})`);
        }
      }
    }
    
    console.log(`\nLinking completed successfully!`);
    console.log(`Linked ${linkedCount} appointments to clients`);
    
    // Show statistics
    const [totalRow] = await db.select({ value: count() }).from(appointments);
    const [linkedRow] = await db
      .select({ value: count() })
      .from(appointments)
      .where(isNotNull(appointments.clientId));
    const [unlinkedRow] = await db
      .select({ value: count() })
      .from(appointments)
      .where(isNull(appointments.clientId));

    console.log("\nAppointment Statistics:");
    console.log(`Total Appointments: ${totalRow.value}`);
    console.log(`Linked to Clients: ${linkedRow.value}`);
    console.log(`Not Linked: ${unlinkedRow.value}`);
    
  } catch (error) {
    console.error("Linking failed:", error);
    process.exit(1);
  }
}

// Run the linking process
linkAppointmentsToClients()
  .then(() => {
    console.log("\nLinking script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Linking script failed:", error);
    process.exit(1);
  });