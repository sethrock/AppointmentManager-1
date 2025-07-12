import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { insertAppointmentSchema } from "@shared/schema";
import { handleNewAppointmentNotifications, handleAppointmentStatusNotifications } from "./services/notificationService";
import { testEmailSending, testCalendarConnection } from "./services/testService";
import { importAppointmentsFromJson, validateImportFile } from "./services/importService";
import { log } from "./vite";
import multer from "multer";
import path from "path";
import { setupSession } from "./middleware/session";
import { registerHandler, loginHandler, logoutHandler, getCurrentUserHandler, isAuthenticated } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  setupSession(app);
  
  // API Routes - all prefixed with /api
  
  // ===== Authentication ===== //
  app.post("/api/auth/register", registerHandler);
  app.post("/api/auth/login", loginHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.get("/api/auth/me", getCurrentUserHandler);
  
  // ===== Providers ===== //
  app.get("/api/providers", async (req: Request, res: Response) => {
    try {
      const providers = await storage.getProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ message: "Failed to retrieve providers" });
    }
  });
  
  // ===== Appointments ===== //
  
  // Get all appointments
  app.get("/api/appointments", async (req: Request, res: Response) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to retrieve appointments" });
    }
  });
  
  // Get a single appointment
  app.get("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const appointment = await storage.getAppointment(id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Failed to retrieve appointment" });
    }
  });
  
  // Create a new appointment
  app.post("/api/appointments", async (req: Request, res: Response) => {
    try {
      // Validate request body against schema
      const parsedData = insertAppointmentSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const newAppointment = await storage.createAppointment(parsedData.data);
      
      // Send notifications for the new appointment (async)
      handleNewAppointmentNotifications(newAppointment)
        .then(async (result) => {
          log(`Notifications processed for new appointment ${newAppointment.id}`, 'routes');
        })
        .catch(error => {
          log(`Error processing notifications for appointment ${newAppointment.id}: ${error}`, 'routes');
        });
      
      res.status(201).json(newAppointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });
  
  // Update an appointment
  app.patch("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      // Get the current appointment to track status changes
      const currentAppointment = await storage.getAppointment(id);
      if (!currentAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Store the previous status to detect changes
      const previousStatus = currentAppointment.dispositionStatus || null;
      
      // Partial validation - only validate fields that are included
      const partialSchema = insertAppointmentSchema.partial();
      const parsedData = partialSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        const validationError = fromZodError(parsedData.error);
        return res.status(400).json({ 
          message: "Validation error",
          errors: validationError.details 
        });
      }
      
      const updatedAppointment = await storage.updateAppointment(id, parsedData.data);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Handle notifications when disposition status changes OR when reschedule dates change
      const isStatusChange = parsedData.data.dispositionStatus && 
                           parsedData.data.dispositionStatus !== previousStatus;
      
      const isRescheduleUpdate = updatedAppointment.dispositionStatus === 'Reschedule' && 
                                (parsedData.data.updatedStartDate || 
                                 parsedData.data.updatedStartTime || 
                                 parsedData.data.updatedEndDate || 
                                 parsedData.data.updatedEndTime);
      
      if (isStatusChange || isRescheduleUpdate) {
        // Process notifications asynchronously to not block the response
        handleAppointmentStatusNotifications(updatedAppointment, previousStatus)
          .then(() => {
            if (isStatusChange) {
              log(`Status notifications processed for appointment ${id} (${previousStatus} -> ${updatedAppointment.dispositionStatus})`, 'routes');
            } else {
              log(`Reschedule date/time update notifications processed for appointment ${id}`, 'routes');
            }
          })
          .catch(error => {
            log(`Error processing notifications for appointment ${id}: ${error}`, 'routes');
          });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });
  
  // Delete an appointment
  app.delete("/api/appointments/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const success = await storage.deleteAppointment(id);
      if (!success) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });
  
  // Confirm deposit return
  app.patch("/api/appointments/:id/confirm-deposit-return", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid appointment ID" });
      }
      
      const updatedAppointment = await storage.confirmDepositReturn(id);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error confirming deposit return:", error);
      res.status(500).json({ message: "Failed to confirm deposit return" });
    }
  });
  
  // ===== Import Data ===== //
  
  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept any file with .json extension regardless of mimetype
      if (file.originalname.toLowerCase().endsWith('.json')) {
        cb(null, true);
      } else {
        cb(new Error('Only JSON files are allowed'));
      }
    }
  });
  
  // Validate import file
  app.post("/api/import/validate", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await validateImportFile(filePath);
      
      res.json({
        message: `Validation completed. Valid: ${result.valid}, Invalid: ${result.invalid}`,
        ...result
      });
    } catch (error) {
      console.error("Error validating import file:", error);
      res.status(500).json({ 
        message: `Error validating import file: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Import appointments from file
  app.post("/api/import/appointments", upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }
      
      const filePath = req.file.path;
      const result = await importAppointmentsFromJson(filePath);
      
      res.json({
        message: `Import completed. Imported ${result.success} appointments, Failed: ${result.failed}`,
        ...result
      });
    } catch (error) {
      console.error("Error importing appointments:", error);
      res.status(500).json({ 
        message: `Error importing appointments: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // ===== Test Endpoints ===== //
  
  // Test email notification
  app.post("/api/test/email", async (req: Request, res: Response) => {
    try {
      const success = await testEmailSending();
      if (success) {
        res.json({ 
          success: true, 
          message: "Test email sent successfully. Check the email address configured in NOTIFICATION_EMAIL." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test email. Check server logs for details." 
        });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error sending test email: ${error}` 
      });
    }
  });
  
  // Test Google Calendar connection
  app.post("/api/test/calendar", async (req: Request, res: Response) => {
    try {
      const success = await testCalendarConnection();
      if (success) {
        res.json({ 
          success: true, 
          message: "Successfully connected to Google Calendar API." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to connect to Google Calendar API. Check server logs for details or make sure GOOGLE_REFRESH_TOKEN is configured." 
        });
      }
    } catch (error) {
      console.error("Error testing calendar connection:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing calendar connection: ${error}` 
      });
    }
  });

  // Secure database import endpoints
  app.post("/api/import/preview", async (req: Request, res: Response) => {
    try {
      const { previewImport } = await import('./services/secureImportService');
      const filePath = './server/data/6.2.25_database.json';
      const result = await previewImport(filePath);
      
      res.json({
        message: "Preview completed successfully",
        ...result
      });
    } catch (error) {
      console.error("Error previewing import:", error);
      res.status(500).json({ 
        message: `Error previewing import: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.post("/api/import/secure", async (req: Request, res: Response) => {
    try {
      const { secureImportAppointments } = await import('./services/secureImportService');
      const filePath = './server/data/6.2.25_database.json';
      const result = await secureImportAppointments(filePath);
      
      if (result.success) {
        res.json({
          message: `Successfully imported ${result.importedRecords} appointments. Backup created: ${result.backupTableName}`,
          ...result
        });
      } else {
        res.status(400).json({
          message: "Import failed",
          ...result
        });
      }
    } catch (error) {
      console.error("Error during secure import:", error);
      res.status(500).json({ 
        message: `Error during import: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.get("/api/backup/list", async (req: Request, res: Response) => {
    try {
      const { listBackups } = await import('./services/databaseBackupService');
      const backups = await listBackups();
      
      res.json({
        message: "Backup list retrieved successfully",
        backups
      });
    } catch (error) {
      console.error("Error listing backups:", error);
      res.status(500).json({ 
        message: `Error listing backups: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.post("/api/backup/restore/:backupName", async (req: Request, res: Response) => {
    try {
      const { restoreFromBackup } = await import('./services/databaseBackupService');
      const { backupName } = req.params;
      
      await restoreFromBackup(backupName);
      
      res.json({
        message: `Successfully restored from backup: ${backupName}`
      });
    } catch (error) {
      console.error("Error restoring from backup:", error);
      res.status(500).json({ 
        message: `Error restoring from backup: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });

  app.get("/api/analytics/future-earnings", async (req: Request, res: Response) => {
    try {
      const { calculateFutureEarnings } = await import('./services/futureEarningsService');
      const { timeframe = 'all', provider, includeRescheduled = 'true' } = req.query;
      
      const result = await calculateFutureEarnings({
        timeframe: timeframe as string,
        provider: provider as string | undefined,
        includeRescheduled: includeRescheduled === 'true'
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating future earnings:", error);
      res.status(500).json({ 
        message: `Error calculating future earnings: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
